import { NextResponse } from "next/server";
import { chatRequestSchema } from "@/lib/validations/chat";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const SYSTEM_PROMPT = `Eres Artemisa, asistente virtual de Apolo Lubricantes (Ecuador).
Ayudas a clientes a elegir lubricantes, grasas, refrigerantes y fluidos (viscosidad SAE, marcas como Apolo, Overts, Amalie, etc.).
Responde en español, claro y breve (máx. 3-5 frases salvo que pidan detalle).
Si preguntan precios exactos o stock en tiempo real, invita a armar una cotización en la web o escribir por WhatsApp.
No inventes certificaciones ni datos técnicos dudosos; si no sabes, dilo y ofrece contacto humano.
No menciones que eres GPT salvo que te lo pregunten.`;

export async function POST(req: Request) {
  try {
    const limited = rateLimit(clientKey(req, "chat"), 12, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { message: "Demasiadas consultas. Espera un momento e inténtalo de nuevo." },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) },
        }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: "Chat no configurado (falta OPENAI_API_KEY)." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Mensajes inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const model = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...parsed.data.messages.map((m) => ({
        role: m.role,
        content: m.content.slice(0, 4000),
      })),
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.5,
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("OpenAI error:", res.status, errText);
      return NextResponse.json(
        { message: "No se pudo obtener respuesta del asistente." },
        { status: 502 }
      );
    }

    const data = await res.json();
    const reply =
      data?.choices?.[0]?.message?.content?.trim() ||
      "No pude generar una respuesta. Intenta de nuevo o escríbenos por WhatsApp.";

    return NextResponse.json({ reply });
  } catch (e) {
    console.error("chat route:", e);
    return NextResponse.json({ message: "Error interno del chat." }, { status: 500 });
  }
}
