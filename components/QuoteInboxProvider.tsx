"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBrowserSupabase } from "@/lib/supabase-client";

export type InboxQuote = {
  id: string;
  code: string;
  client_name?: string | null;
  city?: string | null;
  phone?: string | null;
  created_at: string;
  status: string;
};

type InboxValue = {
  count: number;
  quotes: InboxQuote[];
  revision: number;
  refresh: () => void;
};

const InboxContext = createContext<InboxValue>({
  count: 0,
  quotes: [],
  revision: 0,
  refresh: () => {},
});

export function useQuoteInbox() {
  return useContext(InboxContext);
}

function labelOf(quote: Partial<InboxQuote>) {
  const who = quote.client_name || "Un cliente";
  const where = quote.city ? ` · ${quote.city}` : "";
  const phone = quote.phone ? ` · ${quote.phone}` : "";
  return `${who}${where}${phone}`;
}

export function QuoteInboxProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const router = useRouter();
  const [quotes, setQuotes] = useState<InboxQuote[]>([]);
  const [count, setCount] = useState(0);
  const [revision, setRevision] = useState(0);
  const ready = useRef(false);
  const seen = useRef(new Set<string>());

  const announce = useCallback(
    (quote: Partial<InboxQuote>) => {
      const code = quote.code || "Nueva";
      const description = labelOf(quote);
      toast("Nueva cotización", {
        description: quote.code ? `${code} · ${description}` : description,
        action: {
          label: "Ver",
          onClick: () => router.push(quote.code ? `/admin/cotizaciones/${quote.code}` : "/admin/cotizaciones?estado=nueva"),
        },
      });
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const notice = new Notification("Nueva cotización", {
          body: quote.code ? `${code} · ${description}` : description,
        });
        notice.onclick = () => {
          window.focus();
          router.push(quote.code ? `/admin/cotizaciones/${quote.code}` : "/admin/cotizaciones?estado=nueva");
        };
      }
    },
    [router]
  );

  const refresh = useCallback(async (announceNew = false) => {
    const [{ count: total, error: countError }, list] = await Promise.all([
      supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "nueva"),
      supabase
        .from("quotes")
        .select("id,code,client_name,city,phone,created_at,status")
        .eq("status", "nueva")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);
    if (countError || list.error) return;
    const rows = (list.data || []) as InboxQuote[];
    if (announceNew) {
      rows.forEach((row) => {
        if (seen.current.has(row.id)) return;
        seen.current.add(row.id);
        announce(row);
      });
    } else {
      rows.forEach((row) => seen.current.add(row.id));
    }
    setQuotes(rows);
    setCount(total ?? rows.length);
  }, [announce, supabase]);

  useEffect(() => {
    let alive = true;
    refresh().finally(() => {
      if (alive) ready.current = true;
    });

    const channel = supabase
      .channel("admin-quote-inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "quotes" }, (payload) => {
        const row = (payload.new || {}) as Partial<InboxQuote>;
        if (row.status && row.status !== "nueva") return;
        if (row.id && seen.current.has(row.id)) return;
        if (row.id) seen.current.add(row.id);
        setRevision((value) => value + 1);
        refresh();
        if (ready.current) announce(row);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "quotes" }, () => {
        setRevision((value) => value + 1);
        refresh();
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "quotes" }, () => {
        setRevision((value) => value + 1);
        refresh();
      })
      .subscribe();

    const timer = window.setInterval(() => {
      refresh(true);
    }, 20000);

    return () => {
      alive = false;
      window.clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [announce, refresh, supabase]);

  const value = useMemo(
    () => ({ count, quotes, revision, refresh: () => refresh(false) }),
    [count, quotes, revision, refresh]
  );

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}
