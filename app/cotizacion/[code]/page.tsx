import Link from "next/link";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";

type QuoteItem = {
  id?: string;
  name?: string;
  brand?: string;
  presentation?: string;
  line?: string;
  viscosity?: string;
  quantity?: number;
  image?: string;
  image_url?: string;
};

const STATUS_LABEL: Record<string, string> = {
  nueva: "Recibida",
  enviada: "En revisión",
  cerrada: "Cerrada",
  perdida: "No disponible",
};

function supabaseOrNull() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return null;
  return createClient(url, key);
}

async function getQuote(supabase: SupabaseClient, code: string) {
  const safeCode = String(code || "").trim();
  if (!safeCode) return null;

  // Preferir RPC (no lista la tabla completa). Fallback si aún no se aplicó el SQL.
  const { data: rpcData, error: rpcError } = await supabase.rpc("get_quote_by_code", {
    p_code: safeCode,
  });
  if (!rpcError) {
    if (Array.isArray(rpcData)) return rpcData[0] || null;
    return rpcData || null;
  }

  const { data } = await supabase
    .from("quotes")
    .select("id,code,client_name,city,phone,status,items,total_items,notes,created_at")
    .eq("code", safeCode)
    .maybeSingle();
  return data;
}

async function imagesFor(supabase: SupabaseClient, items: QuoteItem[]) {
  const ids = items.map((item) => item.id).filter((id): id is string => Boolean(id));
  if (ids.length === 0) return new Map<string, string>();
  const { data } = await supabase.from("products").select("id, image_url").in("id", ids);
  return new Map((data || []).filter((row) => row.image_url).map((row) => [String(row.id), String(row.image_url)]));
}

function pictureOf(item: QuoteItem, catalog: Map<string, string>) {
  const stored = item.image || item.image_url || "";
  if (stored && !stored.includes("placeholder")) return stored;
  return (item.id && catalog.get(item.id)) || "";
}

function waDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("51") ? digits : `51${digits.replace(/^0/, "")}`;
}

export default async function CotizacionPublicPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = supabaseOrNull();
  const quote = supabase ? await getQuote(supabase, code) : null;

  if (!quote) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f6f6] px-4 text-[#141414]">
        <div className="max-w-md space-y-3 text-center">
          <h1 className="text-2xl font-black">Cotización no encontrada</h1>
          <p className="text-sm text-[#52525b]">
            El código <span className="font-mono">{code}</span> no existe o aún no está disponible.
          </p>
          <Link href="/" className="inline-block font-semibold text-[#dc2626] underline">
            Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  const items = (Array.isArray(quote.items) ? quote.items : []) as QuoteItem[];
  const catalog = supabase ? await imagesFor(supabase, items) : new Map<string, string>();
  const settings = supabase
    ? (
        await supabase
          .from("business_settings")
          .select("business_name, whatsapp, phone, logo_url")
          .limit(1)
          .maybeSingle()
      ).data
    : null;

  const business = settings?.business_name || "Apolo Lubricantes";
  const phone = settings?.whatsapp || settings?.phone || "+51 958 400 028";
  const units = Number(quote.total_items) || items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const status = STATUS_LABEL[quote.status] || quote.status;
  const when = new Date(quote.created_at).toLocaleString("es-EC", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const message = `Hola, consulto por mi cotización ${quote.code}.`;
  const whatsapp = `https://wa.me/${waDigits(phone)}?text=${encodeURIComponent(message)}`;

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:py-12">
      <div className="site-container mx-auto max-w-xl space-y-5">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-apolo.jpg?v=2026-11-24" alt={business} className="h-12 w-auto" />
          <div>
            <p className="text-sm font-semibold">{business}</p>
            <p className="text-xs text-muted-foreground">Detalle de tu pedido</p>
          </div>
        </div>

        <section className="card-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Cotización</p>
          <h1 className="mt-1 font-mono text-2xl font-black text-primary">{quote.code}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Estado: <strong className="text-foreground">{status}</strong>
            {" · "}
            {when}
          </p>
          <p className="mt-3 text-base">
            Pedido de <strong>{quote.client_name || "cliente"}</strong>
            {quote.city ? (
              <>
                {" "}
                en <strong className="capitalize">{quote.city}</strong>
              </>
            ) : null}
            . {items.length === 1 ? "1 producto" : `${items.length} productos`} y {units}{" "}
            {units === 1 ? "unidad" : "unidades"}.
          </p>
          {quote.phone ? (
            <p className="mt-2 text-sm text-[#52525b]">
              Te contactaremos al <strong className="text-[#141414]">{quote.phone}</strong>.
            </p>
          ) : null}
        </section>

        <section className="card-surface overflow-hidden p-0">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold">Productos cotizados</h2>
          </div>
          <ul>
            {items.map((item, index) => {
              const image = pictureOf(item, catalog);
              const detail = [item.brand, item.presentation, item.viscosity, item.line].filter(Boolean).join(" · ");
              return (
                <li key={`${item.id || item.name}-${index}`} className="flex gap-3 border-t border-border px-4 py-4 first:border-t-0">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt={item.name || "Producto"} className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex h-full items-center justify-center px-2 text-center text-[10px] text-muted-foreground">Sin foto</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight">{item.name}</p>
                    {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
                    <p className="mt-2 inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-bold text-primary">
                      x{item.quantity || 1}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between border-t border-border bg-muted/40 px-5 py-3 text-sm">
            <span className="text-muted-foreground">Total del pedido</span>
            <strong>
              {units} {units === 1 ? "unidad" : "unidades"}
            </strong>
          </div>
        </section>

        {quote.notes ? (
          <section className="card-surface px-5 py-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nota</p>
            <p className="mt-1">{quote.notes}</p>
          </section>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={whatsapp}
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#16a34a] px-4 py-3 text-sm font-semibold text-white"
          >
            Consultar por WhatsApp
          </a>
          <Link
            href="/productos"
            className="btn-gold inline-flex flex-1 items-center justify-center rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold transition-colors hover:border-primary"
          >
            Seguir viendo productos
          </Link>
        </div>
      </div>
    </main>
  );
}


