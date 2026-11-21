import { NextResponse } from "next/server";
import { quoteCreateSchema } from "@/lib/validations/quote";
import { generateQuoteCode } from "@/lib/quotes";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const limited = rateLimit(clientKey(req, "quotes"), 10, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { message: "Demasiadas cotizaciones seguidas. Espera un momento." },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) },
        }
      );
    }

    const body = await req.json();
    const parsed = quoteCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Cotización inválida", errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch {
      return NextResponse.json(
        {
          message:
            "Falta SUPABASE_SECRET_KEY (o SUPABASE_SERVICE_ROLE_KEY) en el servidor para registrar cotizaciones.",
        },
        { status: 500 }
      );
    }

    const { items, clientName, city, phone, notes } = parsed.data;
    const code = generateQuoteCode();
    const total_items = items.reduce((acc, i) => acc + i.quantity, 0);

    let customer_id: string | null = null;
    if (clientName || phone || city) {
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .insert({
          name: clientName || "Cliente web",
          phone: phone || null,
          city: city || null,
        })
        .select("id")
        .maybeSingle();

      if (customerError) {
        console.error("customer insert:", customerError);
      } else {
        customer_id = customer?.id || null;
      }
    }

    const { data, error } = await supabase
      .from("quotes")
      .insert({
        code,
        customer_id,
        client_name: clientName || null,
        city: city || null,
        phone: phone || null,
        status: "nueva",
        channel: "whatsapp",
        items,
        total_items,
        notes: notes || null,
      })
      .select("id,code")
      .single();

    if (error) {
      console.error("quote insert:", error);
      return NextResponse.json(
        { message: "No se pudo guardar la cotización." },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: data.id, code: data.code }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
