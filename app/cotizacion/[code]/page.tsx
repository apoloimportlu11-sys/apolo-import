import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";

type QuoteItem = {
  name?: string;
  brand?: string;
  presentation?: string;
  quantity?: number;
};

async function getQuote(code: string) {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return null;
  const supabase = createClient(url, key);
  const { data } = await supabase
    .from("quotes")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  return data;
}

export default async function CotizacionPublicPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const quote = await getQuote(code);

  if (!quote) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-black">Cotización no encontrada</h1>
          <p className="text-sm text-muted-foreground">
            El código <span className="font-mono">{code}</span> no existe o aún no está
            disponible.
          </p>
          <Link href="/" className="inline-block text-primary font-semibold underline">
            Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  const items = (Array.isArray(quote.items) ? quote.items : []) as QuoteItem[];

  return (
    <main className="min-h-screen bg-background text-foreground py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="border-b border-border pb-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
            Seguimiento de cotización
          </p>
          <h1 className="text-2xl font-black mt-1 font-mono text-primary">{quote.code}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Estado: <strong className="text-foreground">{quote.status}</strong>
            {" · "}
            {new Date(quote.created_at).toLocaleString("es-EC")}
          </p>
          {(quote.client_name || quote.city) && (
            <p className="text-sm mt-1">
              {quote.client_name || "Cliente"}
              {quote.city ? ` · ${quote.city}` : ""}
            </p>
          )}
        </div>

        <ul className="space-y-3">
          {items.map((item, idx) => (
            <li
              key={`${item.name}-${idx}`}
              className="rounded-xl border border-border bg-card p-4 flex justify-between gap-3"
            >
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[item.brand, item.presentation].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span className="font-bold text-primary">x{item.quantity || 1}</span>
            </li>
          ))}
        </ul>

        <p className="text-sm text-muted-foreground">
          Total unidades: <strong>{quote.total_items}</strong>
        </p>

        <Link href="/productos" className="inline-block text-sm font-semibold text-primary underline">
          Seguir viendo productos
        </Link>
      </div>
    </main>
  );
}
