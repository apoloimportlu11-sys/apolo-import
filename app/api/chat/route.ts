import { NextResponse } from "next/server";
import { chatRequestSchema } from "@/lib/validations/chat";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { completeChat } from "@/lib/chat-provider";

const SYSTEM_PROMPT = `Eres Artemisa, asistente virtual de Apolo Import / Apolo Lubricantes (Lima, Perú).

MARCAS PRINCIPALES (prioridad absoluta, en este orden):
1) Apolo — lubricantes propios: motor gasolina/diésel, transmisión, grasas e industria.
2) Overts — lubricantes, grasas, refrigerantes y fluidos automotrices.
3) Valtrom — repuestos y autopartes (línea en crecimiento).

REGLAS DE MARCA:
- Habla primero de Apolo, Overts o Valtrom. Son el núcleo del negocio.
- Si el cliente nombra una de esas tres, quédate en esa marca: recomienda productos o categorías que SÍ tenga (aceites, grasas, refrigerantes, transmisiones, etc.).
- Si pide algo que esa marca no tiene (ej. líquido de frenos Overts), dilo con claridad y ofrece alternativas DENTRO de Apolo/Overts/Valtrom (por ejemplo refrigerantes Overts, aceites Apolo, grasas Overts). No saltes de inmediato a marcas aliadas.
- Marcas aliadas (Frenosa, Amalie, Prestone, Bosch, etc.) solo como opción secundaria y breve, después de ofrecer las principales.
- Invita a filtrar el catálogo web por marca (Apolo / Overts / Valtrom) o a cotizar.

ESTILO:
- Español claro y breve (máx. 3-5 frases, salvo que pidan detalle).
- Tono comercial útil, sin tecnicismos inventados.
- Precios exactos o stock en tiempo real: invita a cotizar en la web o WhatsApp.
- No inventes certificaciones ni fichas técnicas; si no sabes, dilo y ofrece asesoría humana.
- No menciones el modelo de IA salvo que te lo pregunten.`;

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
