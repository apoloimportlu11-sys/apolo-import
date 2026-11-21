import { NextResponse } from "next/server";
import { chatRequestSchema } from "@/lib/validations/chat";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { completeChat } from "@/lib/chat-provider";

const SYSTEM_PROMPT = `Eres Artemisa, asistente virtual de Apolo Lubricantes (Ecuador).
Ayudas a clientes a elegir lubricantes, grasas, refrigerantes y fluidos (viscosidad SAE, marcas propias Apolo, Overts y Valtrom, y aliadas como Amalie, Frenosa, etc.).
Responde en español, claro y breve (máx. 3-5 frases salvo que pidan detalle).
Si preguntan precios exactos o stock en tiempo real, invita a armar una cotización en la web o escribir por WhatsApp.
No inventes certificaciones ni datos técnicos dudosos; si no sabes, dilo y ofrece contacto humano.
No menciones el modelo de IA salvo que te lo pregunten.`;

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

    if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { message: "Chat no configurado (falta GEMINI_API_KEY u OPENAI_API_KEY)." },
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

    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...parsed.data.messages.map((m) => ({
        role: m.role,
        content: m.content.slice(0, 4000),
      })),
    ];

    try {
      const { reply } = await completeChat(messages, {
        temperature: 0.5,
        maxTokens: 500,
      });
      return NextResponse.json({ reply });
    } catch (error) {
      console.error("chat provider error:", error);
      return NextResponse.json(
        { message: "No se pudo obtener respuesta del asistente." },
        { status: 502 }
      );
    }
  } catch (e) {
    console.error("chat route:", e);
    return NextResponse.json({ message: "Error interno del chat." }, { status: 500 });
  }
}
