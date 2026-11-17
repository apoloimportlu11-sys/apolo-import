"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  ClipboardList,
  Copy,
  Loader2,
  MessageCircle,
  Package,
  Send,
  Sparkles,
  Warehouse,
  X,
} from "lucide-react";
import { useAdminRole } from "@/hooks/use-admin-role";
import { ROLE_LABELS, type StaffRole } from "@/lib/admin-permissions";
import { extractQuoteCode, extractWhatsAppDraft } from "@/lib/admin-chat-context";
import { showAppToast } from "@/components/app-toast";
import { useQuoteInbox } from "@/components/QuoteInboxProvider";

type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  whatsappDraft?: string | null;
  focusPhone?: string | null;
};

function welcomeForRole(role: StaffRole | null, newQuotes: number): string {
  const label = role ? ROLE_LABELS[role] : "equipo";
  const quoteHint =
    newQuotes > 0
      ? ` Tienes ${newQuotes} cotización${newQuotes === 1 ? "" : "es"} nueva${newQuotes === 1 ? "" : "s"}: elige una abajo para analizarla.`
      : " Abre una cotización o escribe su código (APL-…) para analizarla.";

  if (role === "almacen") {
    return `Hola. Asistente Apolo (${label}). Puedo revisar stock de lo que pidió el cliente y avisar faltantes.${quoteHint}`;
  }
  return `Hola. Asistente Apolo (${label}). Analizo la cotización del cliente, te digo qué producto le conviene, otras opciones y un mensaje listo para WhatsApp.${quoteHint}`;
}

function displayReply(content: string): string {
  return content.replace(/```whatsapp\s*[\s\S]*?```/gi, "").trim();
}

function waMeUrl(phone: string | null | undefined, text: string): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  if (digits.length === 9) digits = `51${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

type AdminAssistPanelProps = {
  embedded?: boolean;
  open?: boolean;
  onClose?: () => void;
  /** Cotización a analizar al abrir (desde detalle / evento). */
  pendingQuoteCode?: string | null;
  onPendingQuoteConsumed?: () => void;
};

export default function AdminAssistPanel({
  embedded = false,
  open = true,
  onClose,
  pendingQuoteCode = null,
  onPendingQuoteConsumed,
}: AdminAssistPanelProps) {
  const pathname = usePathname();
  const { role } = useAdminRole();
  const { count: newQuotes, quotes: inboxQuotes } = useQuoteInbox();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pendingHandled = useRef<string | null>(null);

  const pathQuoteCode = useMemo(() => extractQuoteCode(pathname), [pathname]);
  const welcome = useMemo(() => welcomeForRole(role, newQuotes), [role, newQuotes]);

  useEffect(() => {
    setMessages([{ role: "assistant", content: welcome }]);
  }, [welcome]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open, sending]);

  useEffect(() => {
    if (!embedded && open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 180);
      return () => window.clearTimeout(t);
    }
  }, [embedded, open]);

  useEffect(() => {
    if (embedded || !open || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [embedded, open, onClose]);

  async function ask(text: string, quoteCode?: string | null) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const code = quoteCode || extractQuoteCode(trimmed, pathname);
    let payload: ChatMsg[] = [];
    setMessages((prev) => {
      payload = [...prev, { role: "user", content: trimmed }];
      return payload;
    });
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/admin/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageContext: pathname,
          quoteCode: code || undefined,
          messages: payload.slice(-16).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Error del asistente");
      }
      const reply = String(data.reply || "Sin respuesta.");
      const draft =
        (typeof data.whatsappDraft === "string" && data.whatsappDraft) ||
        extractWhatsAppDraft(reply);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: reply,
          whatsappDraft: draft,
          focusPhone: data?.meta?.focusPhone || null,
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error del asistente";
      showAppToast({
        tone: "error",
        title: "Asistente no disponible",
        description: message,
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "No pude responder ahora. Revisa la conexión o OPENAI_API_KEY, o abre la cotización en el panel.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function analyzeQuote(code: string, clientName?: string | null) {
    const who = clientName ? ` de ${clientName}` : "";
    void ask(
      `Analiza la cotización ${code}${who}. Dime qué productos le convienen, sugiere otros del catálogo y genera el mensaje de WhatsApp para el cliente.`,
      code
    );
  }

  useEffect(() => {
    if (!open || !pendingQuoteCode) return;
    if (pendingHandled.current === pendingQuoteCode) return;
    pendingHandled.current = pendingQuoteCode;
    const code = pendingQuoteCode;
    onPendingQuoteConsumed?.();
    const t = window.setTimeout(() => analyzeQuote(code), 80);
    return () => window.clearTimeout(t);
    // Solo reacciona al código pendiente al abrir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pendingQuoteCode]);

  async function copyWhatsApp(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      showAppToast({
        tone: "success",
        title: "Mensaje copiado",
        description: "Pégalo en WhatsApp del cliente.",
      });
    } catch {
      showAppToast({
        tone: "error",
        title: "No se pudo copiar",
        description: "Selecciona el texto del mensaje manualmente.",
      });
    }
  }

  function sendMessage(e?: FormEvent) {
    e?.preventDefault();
    void ask(input);
  }

  if (!embedded && !open) return null;

  const shell = (
    <div
      className={
        embedded
          ? "flex h-full min-h-[32rem] flex-col overflow-hidden rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] shadow-sm"
          : "flex h-full w-full flex-col overflow-hidden border-l border-[var(--admin-line)] bg-[var(--admin-surface)] shadow-[-12px_0_40px_rgba(0,0,0,0.18)]"
      }
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--admin-line)] bg-[linear-gradient(135deg,#1a1212_0%,#1f1a14_50%,#141414_100%)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C7940A]/18 text-[#E8C45A] ring-1 ring-[#C7940A]/40">
            <Bot className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
              Asistente Apolo
              <Sparkles className="h-3.5 w-3.5 text-[#C7940A]" />
            </p>
            <p className="truncate text-[11px] text-zinc-400">
              {role ? ROLE_LABELS[role] : "Personal"} · cotización → WhatsApp
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {newQuotes > 0 ? (
            <Link
              href="/admin/cotizaciones?estado=nueva"
              className="hidden items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[10px] font-medium text-[#E8C45A] hover:bg-white/15 sm:inline-flex"
              onClick={() => onClose?.()}
            >
              <ClipboardList className="h-3 w-3" />
              {newQuotes} nuevas
            </Link>
          ) : null}
          {!embedded && onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar asistente"
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-[var(--admin-line)] bg-[var(--admin-canvas)] px-3 py-2">
        <Link
          href="/admin/cotizaciones"
          onClick={() => onClose?.()}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--admin-line)] bg-[var(--admin-surface)] px-2.5 py-1 text-[11px] text-[var(--admin-muted)] hover:border-[#C7940A]/50 hover:text-[var(--admin-ink)]"
        >
          <ClipboardList className="h-3 w-3 text-[#C7940A]" />
          Cotizaciones
        </Link>
        <Link
          href="/admin/productos"
          onClick={() => onClose?.()}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--admin-line)] bg-[var(--admin-surface)] px-2.5 py-1 text-[11px] text-[var(--admin-muted)] hover:border-[#C7940A]/50 hover:text-[var(--admin-ink)]"
        >
          <Package className="h-3 w-3 text-[#C7940A]" />
          Productos
        </Link>
        <Link
          href="/admin/inventario"
          onClick={() => onClose?.()}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--admin-line)] bg-[var(--admin-surface)] px-2.5 py-1 text-[11px] text-[var(--admin-muted)] hover:border-[#C7940A]/50 hover:text-[var(--admin-ink)]"
        >
          <Warehouse className="h-3 w-3 text-[#C7940A]" />
          Inventario
        </Link>
      </div>

      {(pathQuoteCode || inboxQuotes.length > 0) && messages.length <= 1 ? (
        <div className="shrink-0 space-y-2 border-b border-[var(--admin-line)] bg-[var(--admin-canvas)] px-3 py-2.5">
          {pathQuoteCode ? (
            <button
              type="button"
              disabled={sending}
              onClick={() => analyzeQuote(pathQuoteCode)}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#C7940A]/40 bg-[#C7940A]/10 px-3 py-2 text-left text-xs font-medium text-[var(--admin-ink)] hover:bg-[#C7940A]/18 disabled:opacity-50"
            >
              <span className="min-w-0 truncate">
                Analizar cotización <span className="font-mono">{pathQuoteCode}</span>
              </span>
              <MessageCircle className="h-3.5 w-3.5 shrink-0 text-[#C7940A]" />
            </button>
          ) : null}
          {inboxQuotes.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium tracking-wide text-[var(--admin-faint)] uppercase">
                Cotizaciones nuevas
              </p>
              <ul className="max-h-28 space-y-1 overflow-y-auto">
                {inboxQuotes.slice(0, 5).map((q) => (
                  <li key={q.id}>
                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => analyzeQuote(q.code, q.client_name)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface)] px-2.5 py-1.5 text-left text-[11px] hover:border-[#C7940A]/45 disabled:opacity-50"
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-mono font-semibold text-[var(--admin-ink)]">{q.code}</span>
                        <span className="text-[var(--admin-muted)]">
                          {" · "}
                          {q.client_name || "Cliente"}
                          {q.city ? ` · ${q.city}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-[#C7940A]">Analizar</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3.5 py-3.5">
        {messages.map((msg, idx) => (
          <div
            key={`${msg.role}-${idx}`}
            className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "rounded-br-md bg-[var(--admin-accent)] text-white"
                  : "rounded-bl-md border border-[var(--admin-line)] bg-[var(--admin-canvas)] text-[var(--admin-ink)]"
              }`}
            >
              {msg.role === "assistant" ? displayReply(msg.content) : msg.content}
            </div>
            {msg.role === "assistant" && msg.whatsappDraft ? (
              <div className="max-w-[92%] w-full rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
                    Mensaje WhatsApp
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void copyWhatsApp(msg.whatsappDraft!)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-emerald-800 hover:bg-emerald-500/15 dark:text-emerald-300"
                    >
                      <Copy className="h-3 w-3" />
                      Copiar
                    </button>
                    {(() => {
                      const matched = inboxQuotes.find((q) =>
                        msg.content.includes(q.code)
                      );
                      const phone = msg.focusPhone || matched?.phone;
                      const url = waMeUrl(phone, msg.whatsappDraft!);
                      if (!url) return null;
                      return (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-emerald-800 hover:bg-emerald-500/15 dark:text-emerald-300"
                        >
                          <MessageCircle className="h-3 w-3" />
                          Abrir WA
                        </a>
                      );
                    })()}
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-[var(--admin-ink)]">
                  {msg.whatsappDraft}
                </p>
              </div>
            ) : null}
          </div>
        ))}

        {sending ? (
          <div className="flex items-center gap-2 text-xs text-[var(--admin-muted)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#C7940A]" />
            Analizando cotización y catálogo…
          </div>
        ) : null}
      </div>

      <form
        onSubmit={sendMessage}
        className="shrink-0 border-t border-[var(--admin-line)] bg-[var(--admin-canvas)] p-3"
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={2}
            placeholder="Ej. Analiza APL-… o escribe el código de la cotización"
            className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-[var(--admin-line)] bg-[var(--admin-surface)] px-3 py-2 text-sm text-[var(--admin-ink)] placeholder:text-[var(--admin-faint)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C7940A]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(input);
              }
            }}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#C7940A] text-black hover:bg-[#d9a311] disabled:opacity-50"
            aria-label="Enviar"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-2 text-[10px] leading-snug text-[var(--admin-faint)]">
          Sugiere productos, extras y mensaje WhatsApp · no modifica datos. Enter envía.
        </p>
      </form>
    </div>
  );

  if (embedded) return shell;

  return (
    <div className="pointer-events-none fixed inset-y-0 right-0 z-[55] flex justify-end">
      <button
        type="button"
        aria-label="Cerrar fondo del asistente"
        className="pointer-events-auto absolute inset-0 bg-black/35 sm:hidden"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Asistente IA Apolo"
        className="pointer-events-auto relative flex h-full w-[min(100vw,22.5rem)] animate-in slide-in-from-right duration-200 sm:w-[24rem]"
      >
        {shell}
      </aside>
    </div>
  );
}
