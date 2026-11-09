import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuoteItem } from "@/lib/quote-context";

export type QuoteStatus = "nueva" | "enviada" | "cerrada" | "perdida";

export type QuoteRow = {
  id: string;
  code: string;
  customer_id?: string | null;
  client_name?: string | null;
  city?: string | null;
  phone?: string | null;
  status: QuoteStatus;
  channel: string;
  items: QuoteItem[];
  total_items: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export function generateQuoteCode() {
  const d = new Date();
  const stamp = [
    d.getFullYear().toString().slice(-2),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `APL-${stamp}-${rand}`;
}

export async function persistQuote(
  supabase: SupabaseClient,
  input: {
    items: QuoteItem[];
    clientName?: string;
    city?: string;
    phone?: string;
    notes?: string;
    status?: QuoteStatus;
  }
) {
  const code = generateQuoteCode();
  const total_items = input.items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);

  let customer_id: string | null = null;
  if (input.clientName || input.phone || input.city) {
    const { data: customer } = await supabase
      .from("customers")
      .insert({
        name: input.clientName || "Cliente web",
        phone: input.phone || null,
        city: input.city || null,
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
      client_name: input.clientName || null,
      city: input.city || null,
      phone: input.phone || null,
      status: input.status || "nueva",
      channel: "whatsapp",
      items: input.items,
      total_items,
      notes: input.notes || null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as QuoteRow;
}

export async function fetchQuotes(supabase: SupabaseClient, status?: QuoteStatus | "all") {
  let q = supabase.from("quotes").select("*").order("created_at", { ascending: false }).limit(200);
  if (status && status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as QuoteRow[];
}

export async function fetchQuoteByCode(supabase: SupabaseClient, code: string) {
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  return data as QuoteRow | null;
}

export async function updateQuoteStatus(
  supabase: SupabaseClient,
  id: string,
  status: QuoteStatus
) {
  const { error } = await supabase
    .from("quotes")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
