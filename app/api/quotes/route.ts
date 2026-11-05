import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { quoteCreateSchema } from "@/lib/validations/quote";
import { generateQuoteCode } from "@/lib/quotes";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = quoteCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Cotización inválida", errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey();
    if (!url || !key) {
      return NextResponse.json({ message: "Supabase no configurado" }, { status: 500 });
    }

    const supabase = createClient(url, key);
    const { items, clientName, city, phone, notes } = parsed.data;
    const code = generateQuoteCode();
    const total_items = items.reduce((acc, i) => acc + i.quantity, 0);

    let customer_id: string | null = null;
    if (clientName || phone || city) {
      const { data: customer } = await supabase
        .from("customers")
        .insert({
          name: clientName || "Cliente web",
          phone: phone || null,
          city: city || null,
        })
        .select("id")
        .maybeSingle();
      customer_id = customer?.id || null;
    }

    const { data, error } = await supabase
      .from("quotes")
      .insert({
        code,
        customer_id,
        client_name: clientName || null,
        city: city || null,
        phone: phone || null,
        status: "enviada",
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
        { message: "No se pudo guardar la cotización. ¿Ejecutaste supabase_quotes.sql?" },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: data.id, code: data.code }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
