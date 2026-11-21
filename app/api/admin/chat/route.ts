import { NextResponse } from "next/server";
import { adminChatRequestSchema } from "@/lib/validations/chat";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { requireStaff } from "@/lib/require-admin";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  buildStaffSystemPrompt,
  extractWhatsAppDraft,
  retrieveCatalogContext,
} from "@/lib/admin-chat-context";
import { completeChat } from "@/lib/chat-provider";

export async function POST(req: Request) {
  try {
    const staff = await requireStaff();
    if (!staff.ok) {
      return NextResponse.json({ message: staff.message }, { status: staff.status });
    }

    const limited = rateLimit(clientKey(req, `admin-chat:${staff.userId}`), 30, 60_000);
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
        { message: "Asistente no configurado (falta GEMINI_API_KEY u OPENAI_API_KEY)." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const parsed = adminChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Mensajes inválidos", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const lastUser = [...parsed.data.messages].reverse().find((m) => m.role === "user");
    const userQuery = lastUser?.content || "";
    const analyzingQuote = Boolean(parsed.data.quoteCode) || /cotiz|analiza|whatsapp|suger/i.test(userQuery);

    const supabase = await createServerSupabase();
    const { products, business, quotes, focusQuote } = await retrieveCatalogContext(
      supabase,
      userQuery,
      {
        quoteCode: parsed.data.quoteCode || null,
        pageContext: parsed.data.pageContext || null,
      }
    );

    const systemPrompt = buildStaffSystemPrompt({
      role: staff.role,
      products,
      business,
      quotes,
      focusQuote,
      pageContext: parsed.data.pageContext || null,
    });

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...parsed.data.messages.map((m) => ({
        role: m.role,
        content: m.content.slice(0, 4000),
      })),
    ];

    let reply: string;
    try {
      const completed = await completeChat(messages, {
        temperature: 0.4,
        maxTokens: analyzingQuote ? 1100 : 700,
      });
      reply = completed.reply;
    } catch (error) {
      console.error("admin chat provider error:", error);
      return NextResponse.json(
        { message: "No se pudo obtener respuesta del asistente interno." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      reply,
      whatsappDraft: extractWhatsAppDraft(reply),
      meta: {
        role: staff.role,
        matchedProducts: products.length,
        matchedQuotes: quotes.length,
        focusQuote: focusQuote?.code || null,
        focusPhone: focusQuote?.phone || null,
      },
    });
  } catch (e) {
    console.error("admin chat route:", e);
    return NextResponse.json({ message: "Error interno del asistente." }, { status: 500 });
  }
}
