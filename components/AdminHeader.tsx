"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Monitor, Moon, Sun, Menu, ExternalLink, Bell } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import {
  ADMIN_THEME_EVENT,
  readAdminThemeChoice,
  writeAdminTheme,
  type AdminThemeChoice,
} from "@/lib/admin-theme";
import { useQuoteInbox } from "@/components/QuoteInboxProvider";

const themeOptions: { id: AdminThemeChoice; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Claro", icon: Sun },
  { id: "dark", label: "Oscuro", icon: Moon },
  { id: "system", label: "Sistema", icon: Monitor },
];

export default function AdminHeader({ onOpenMenu }: { onOpenMenu?: () => void }) {
  const supabase = createBrowserSupabase();
  const { settings } = useBusinessSettings();
  const { count, quotes } = useQuoteInbox();
  const [inboxOpen, setInboxOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [theme, setTheme] = useState<AdminThemeChoice>("light");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setUserEmail(data.user.email);
    });
  }, [supabase]);

  useEffect(() => {
    setTheme(readAdminThemeChoice());
    const onTheme = (event: Event) => {
      const next = (event as CustomEvent<AdminThemeChoice>).detail;
      if (next) setTheme(next);
    };
    window.addEventListener(ADMIN_THEME_EVENT, onTheme);
    return () => window.removeEventListener(ADMIN_THEME_EVENT, onTheme);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--admin-line)] bg-[var(--admin-surface)] px-3 py-2 sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        {onOpenMenu && (
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Abrir menú"
            className="inline-flex size-10 items-center justify-center rounded-lg border border-[var(--admin-line)] text-[var(--admin-ink)] lg:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--admin-accent)]"
          >
            <Menu className="size-5" />
          </button>
        )}
        <div className="min-w-0">
          <p className="truncate font-heading text-sm font-semibold text-[var(--admin-ink)]" suppressHydrationWarning>
            {settings.business_name || "Apolo Lubricantes"}
          </p>
          <p className="text-[11px] text-[var(--admin-faint)]">Panel de administración</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="relative">
          <button
            type="button"
            aria-label={count === 1 ? "1 cotización nueva" : count > 0 ? `${count} cotizaciones nuevas` : "Cotizaciones nuevas"}
            aria-expanded={inboxOpen}
            onClick={() => setInboxOpen((open) => !open)}
            className="relative inline-flex size-9 items-center justify-center rounded-lg border border-[var(--admin-line)] text-[var(--admin-ink)]"
          >
            <Bell className="size-4" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--admin-accent)] px-1 text-[10px] font-semibold text-[#ffffff]">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>
          {inboxOpen && (
            <div className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-2 shadow-lg">
              <p className="px-2 py-1 text-xs font-semibold text-[var(--admin-muted)]">
                {count === 0 ? "No hay cotizaciones nuevas" : count === 1 ? "1 en estado Nueva" : `${count} en estado Nueva`}
              </p>
              <ul className="max-h-64 overflow-y-auto">
                {quotes.map((quote) => (
                  <li key={quote.id}>
                    <Link
                      href={`/admin/cotizaciones/${quote.code}`}
                      onClick={() => setInboxOpen(false)}
                      className="block rounded-lg px-2 py-2 hover:bg-[var(--admin-canvas)]"
                    >
                      <p className="font-mono text-sm font-semibold text-[var(--admin-ink)]">{quote.code}</p>
                      <p className="text-xs text-[var(--admin-muted)]">
                        {quote.client_name || "Cliente web"}
                        {quote.phone ? ` · ${quote.phone}` : ""}
                        {quote.city ? ` · ${quote.city}` : ""}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/admin/cotizaciones?estado=nueva"
                onClick={() => setInboxOpen(false)}
                className="mt-1 block rounded-lg px-2 py-2 text-sm font-medium text-[var(--admin-accent)] hover:bg-[var(--admin-canvas)]"
              >
                Ver todas las nuevas
              </Link>
            </div>
          )}
        </div>
        <div
          role="radiogroup"
          aria-label="Tema del panel"
          className="flex rounded-lg border border-[var(--admin-line)] bg-[var(--admin-subtle)] p-0.5"
        >
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const selected = theme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setTheme(option.id);
                  writeAdminTheme(option.id);
                }}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--admin-accent)] sm:px-2.5 ${
                  selected
                    ? "bg-[var(--admin-surface)] text-[var(--admin-ink)] shadow-sm"
                    : "text-[var(--admin-muted)] hover:text-[var(--admin-ink)]"
                }`}
              >
                <Icon className="size-3.5" aria-hidden />
                {option.label}
              </button>
            );
          })}
        </div>

        <Link
          href="/"
          target="_blank"
          rel="noreferrer"
          className="hidden items-center gap-1.5 rounded-lg border border-[var(--admin-line)] px-2.5 py-1.5 text-xs font-medium text-[var(--admin-muted)] hover:text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--admin-accent)] md:inline-flex"
        >
          <ExternalLink className="size-3.5" aria-hidden />
          Ver tienda
        </Link>

        {userEmail && (
          <p className="hidden max-w-[11rem] truncate text-xs text-[var(--admin-faint)] sm:block">{userEmail}</p>
        )}
      </div>
    </header>
  );
}
