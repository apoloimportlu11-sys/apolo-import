import { NextResponse } from "next/server";
import { chatRequestSchema } from "@/lib/validations/chat";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { completeChat } from "@/lib/chat-provider";
import { buildChatCatalogContext } from "@/lib/chat-catalog-context";

const SYSTEM_PROMPT = `Eres Artemisa, asistente virtual de Apolo Import / Apolo Lubricantes (Lima, Perú).

MARCAS PRINCIPALES (prioridad absoluta):
1) Apolo — lubricantes propios.
2) Overts — lubricantes, grasas, refrigerantes y fluidos.
3) Valtrom — repuestos y autopartes.

REGLAS OBLIGATORIAS DE INVENTARIO:
- Tu fuente de verdad es el bloque "INVENTARIO / CATÁLOGO REAL" que recibes en el mensaje de sistema.
- Solo afirma que un producto existe si aparece en ese bloque.
- No inventes productos, marcas, viscosidades, presentaciones ni stock.
- Si hay sección "MARCA PEDIDA", responde primero con esos productos (nombre + presentaciones + disponibilidad).
- Si el bloque muestra líquido de frenos Overts u otros ítems, confírmalos; no digas que "no hay" cuando sí aparecen.
- Si el bloque está vacío o no hay coincidencia, dilo con claridad y ofrece buscar en /productos o cotizar por WhatsApp.
- Marcas aliadas solo si aparecen en el inventario real y solo como respaldo breve después de las principales.

ESTILO:
- Español claro y breve (máx. 3-5 frases, salvo detalle pedido).
- Invita a cotizar en la web o WhatsApp para precios/stock exactos del momento.
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

    const userMessages = parsed.data.messages.map((m) => ({
      role: m.role,
      content: m.content.slice(0, 4000),
    }));
    const lastUser = [...userMessages].reverse().find((m) => m.role === "user");
    const catalog = lastUser
      ? await buildChatCatalogContext(lastUser.content)
      : { contextBlock: "", matchCount: 0, brandsHit: [] as string[] };

    const systemContent = [
      SYSTEM_PROMPT,
      catalog.contextBlock ||
        "INVENTARIO / CATÁLOGO REAL: sin coincidencias claras para esta consulta. No inventes productos; invita a buscar en /productos o cotizar.",
    ].join("\n\n");

    const messages = [
      { role: "system" as const, content: systemContent },
      ...userMessages,
    ];

    try {
      const { reply } = await completeChat(messages, {
        temperature: 0.35,
        maxTokens: 550,
      });
      return NextResponse.json({
        reply,
        meta: {
          catalogMatches: catalog.matchCount,
          brands: catalog.brandsHit,
        },
      });
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
