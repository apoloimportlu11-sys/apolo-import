export type ChatTurn = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ChatCompletionResult = {
  reply: string;
  provider: "gemini" | "openai";
};

function geminiModels() {
  const preferred = process.env.GEMINI_CHAT_MODEL?.trim();
  const fallbacks = [
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-2.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-flash-latest",
  ];
  return [...new Set([preferred, ...fallbacks].filter(Boolean))] as string[];
}

function openaiModel() {
  return process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
}

async function completeWithGemini(
  apiKey: string,
  messages: ChatTurn[],
  options: { temperature: number; maxTokens: number }
): Promise<string> {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n")
    .trim();
  const turns = messages.filter((m) => m.role !== "system");

  const contents = turns.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Gemini exige que el hilo empiece por un turno "user".
  if (!contents.length || contents[0].role !== "user") {
    contents.unshift({
      role: "user",
      parts: [{ text: "Hola" }],
    });
  }

  let lastError = "Gemini no respondió";
  for (const model of geminiModels()) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          signal: AbortSignal.timeout(18_000),
          body: JSON.stringify({
            systemInstruction: system
              ? { parts: [{ text: system }] }
              : undefined,
            contents,
            generationConfig: {
              temperature: options.temperature,
              // Modelos Gemini recientes usan tokens de "thought"; hace falta margen.
              maxOutputTokens: Math.max(options.maxTokens, 1024),
            },
          }),
        }
      );

      const raw = await res.text();
      if (!res.ok) {
        lastError = `Gemini ${model} ${res.status}: ${raw.slice(0, 300)}`;
        // Prueba otro modelo si no está disponible o hay saturación.
        if (res.status === 404 || res.status === 429 || res.status === 503) continue;
        throw new Error(lastError);
      }

      let data: {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };
      try {
        data = JSON.parse(raw);
      } catch {
        lastError = `Gemini ${model}: JSON inválido`;
        continue;
      }

      const reply = String(
        data?.candidates?.[0]?.content?.parts
          ?.map((part) => part?.text || "")
          .join("")
          .trim() || ""
      );
      if (reply) return reply;
      lastError = `Gemini ${model} no devolvió texto`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = `Gemini ${model}: ${message}`;
      // Timeout / red: prueba el siguiente modelo.
      if (/abort|timeout|network|fetch failed/i.test(message)) continue;
      throw error instanceof Error ? error : new Error(message);
    }
  }

  throw new Error(lastError);
}

async function completeWithOpenAI(
  apiKey: string,
  messages: ChatTurn[],
  options: { temperature: number; maxTokens: number }
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openaiModel(),
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const reply = String(data?.choices?.[0]?.message?.content || "").trim();
  if (!reply) {
    throw new Error("OpenAI no devolvió texto");
  }
  return reply;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "error desconocido");
}

/** True si el proveedor falló por cuota, saldo o saturación. */
export function isProviderQuotaError(error: unknown) {
  return /429|insufficient_quota|credit_balance|quota|resource_exhausted|billing/i.test(
    errorMessage(error)
  );
}

/**
 * Prefiere Gemini (GEMINI_API_KEY); si falla o no hay clave, prueba OpenAI.
 * Si OpenAI también falla (p. ej. sin créditos), propaga el último error.
 */
export async function completeChat(
  messages: ChatTurn[],
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ChatCompletionResult> {
  const temperature = options.temperature ?? 0.5;
  const maxTokens = options.maxTokens ?? 500;
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const errors: string[] = [];

  if (!geminiKey && !openaiKey) {
    throw new Error("MISSING_CHAT_API_KEY");
  }

  if (geminiKey) {
    try {
      const reply = await completeWithGemini(geminiKey, messages, {
        temperature,
        maxTokens,
      });
      return { reply, provider: "gemini" };
    } catch (error) {
      errors.push(errorMessage(error));
      console.error("chat gemini failed, trying fallback:", error);
    }
  }

  if (openaiKey) {
    try {
      const reply = await completeWithOpenAI(openaiKey, messages, {
        temperature,
        maxTokens,
      });
      return { reply, provider: "openai" };
    } catch (error) {
      errors.push(errorMessage(error));
      console.error("chat openai failed:", error);
    }
  }

  throw new Error(errors.join(" | ") || "CHAT_PROVIDER_FAILED");
}
