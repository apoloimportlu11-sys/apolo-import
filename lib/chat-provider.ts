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
    "gemini-3.1-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash",
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
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: system
            ? { parts: [{ text: system }] }
            : undefined,
          contents,
          generationConfig: {
            temperature: options.temperature,
            maxOutputTokens: Math.max(options.maxTokens, 256),
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

/** Prefiere Gemini (GEMINI_API_KEY); si no hay, usa OpenAI. */
export async function completeChat(
  messages: ChatTurn[],
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ChatCompletionResult> {
  const temperature = options.temperature ?? 0.5;
  const maxTokens = options.maxTokens ?? 500;
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  if (geminiKey) {
    const reply = await completeWithGemini(geminiKey, messages, {
      temperature,
      maxTokens,
    });
    return { reply, provider: "gemini" };
  }

  if (openaiKey) {
    const reply = await completeWithOpenAI(openaiKey, messages, {
      temperature,
      maxTokens,
    });
    return { reply, provider: "openai" };
  }

  throw new Error("MISSING_CHAT_API_KEY");
}
