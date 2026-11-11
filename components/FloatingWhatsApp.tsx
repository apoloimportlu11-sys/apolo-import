"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { X, Clock, Sparkles, Bot, Loader2, Send } from "lucide-react";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413" />
    </svg>
  );
}

type ChatMsg = { role: "user" | "assistant"; content: string };

const WELCOME: ChatMsg = {
  role: "assistant",
  content:
    "¡Hola! Soy Artemisa, asistente de Apolo Lubricantes. ¿Buscas un aceite, grasa o refrigerante? Cuéntame vehículo o viscosidad (ej. 20W-50).",
};

export default function FloatingWhatsApp() {
  const pathname = usePathname();
  const { settings } = useBusinessSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setHasPrompted(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, isAssistantOpen]);

  const cleanPhone = (settings.whatsapp || settings.phone || "51958400028").replace(/[^0-9]/g, "");
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `¡Hola ${settings.business_name || "Apolo Lubricantes"}! Deseo solicitar información sobre sus lubricantes y aceites.`
  )}`;

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const nextMessages: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.slice(-16).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Error del asistente");
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: String(data.reply || "Sin respuesta.") },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Tuve un problema al responder. Puedes escribirnos por WhatsApp para atención inmediata.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  if (pathname.startsWith("/admin")) return null;

  return (
    <div className="pointer-events-auto fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {isAssistantOpen && (
        <div className="w-[22rem] max-w-[calc(100vw-2rem)] h-[28rem] rounded-2xl border border-border bg-card text-foreground shadow-2xl shadow-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-200 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold shadow-md">
                  <Bot className="w-5 h-5" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-card rounded-full" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Artemisa</h4>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Asistente Virtual · En línea
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsAssistantOpen(false)}
              className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
              aria-label="Cerrar ventana de Artemisa"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2">
            {messages.map((m, i) => (
              <div key={`${m.role}-${i}`} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-muted/80 text-foreground"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-muted/80 px-3 py-2 text-xs text-muted-foreground inline-flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Escribiendo...
                </div>
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} className="border-t border-border p-2.5 flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu consulta..."
              maxLength={2000}
              disabled={sending}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 cursor-pointer"
              aria-label="Enviar mensaje"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>

          <div className="px-3 pb-2.5">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-[11px] text-muted-foreground hover:text-emerald-500 underline-offset-2 hover:underline"
            >
              Preferir WhatsApp con un asesor
            </a>
          </div>
        </div>
      )}

      <button
        onClick={() => {
          setIsAssistantOpen(!isAssistantOpen);
          if (!isAssistantOpen) setIsOpen(false);
        }}
        className="group relative flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-colors duration-200 hover:bg-red-500 cursor-pointer"
        aria-label="Abrir a Artemisa, asistente virtual"
      >
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-400" />
        </span>
        <Bot className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="w-80 rounded-2xl border border-border bg-card text-foreground p-4 shadow-2xl shadow-emerald-950/20 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md">
                  <WhatsAppIcon className="w-5 h-5" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-card rounded-full animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  {settings.business_name || "Apolo Lubricantes"}
                </h4>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Asesoría en línea
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
              aria-label="Cerrar ventana de WhatsApp"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-3 space-y-2 text-xs text-muted-foreground">
            <div className="rounded-xl bg-muted/60 p-2.5 border border-border space-y-1">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-primary" />
                Horario de atención:
              </p>
              <p className="font-semibold text-foreground">
                {settings.hours || "Lun - Vie: 9:00 AM - 6:30 PM"}
              </p>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              ¿Tienes dudas sobre viscosidad, marcas o despacho? ¡Escríbenos directamente y te
              asesoramos al instante!
            </p>
          </div>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 text-xs shadow-lg shadow-emerald-600/30 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
          >
            <WhatsAppIcon className="w-4 h-4" />
            Iniciar Conversación
          </a>
        </div>
      )}

      <div className="relative flex flex-col items-end gap-2">
        {!isOpen && hasPrompted && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center gap-2 rounded-full bg-card border border-border px-3.5 py-1.5 text-xs text-foreground shadow-xl cursor-pointer hover:border-emerald-500/50 transition-all backdrop-blur-md animate-in fade-in slide-in-from-right-4"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>¿En qué te ayudamos hoy?</span>
          </button>
        )}

        <button
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) setIsAssistantOpen(false);
          }}
          className="group relative flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 transition-colors duration-200 hover:bg-emerald-500 cursor-pointer"
          aria-label="Abrir chat de WhatsApp"
        >
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-400" />
          </span>
          <WhatsAppIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
