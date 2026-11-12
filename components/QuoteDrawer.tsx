"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import {
  X,
  Plus,
  Minus,
  Trash2,
  Send,
  ShoppingBag,
  FileText,
  Sparkles,
  ArrowRight,
  Package,
  RotateCcw,
  CheckCircle2,
  User,
  MapPin,
  Phone,
} from "lucide-react";
import { useQuote } from "@/lib/quote-context";

export default function QuoteDrawer() {
  const {
    items,
    removeItem,
    updateQuantity,
    clearQuote,
    totalCount,
    totalUnits,
    isDrawerOpen,
    closeDrawer,
    generateWhatsAppUrl,
    submitQuote,
  } = useQuote();

  const [clientName, setClientName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("apolo_quote_contact");
      if (!raw) return;
      const saved = JSON.parse(raw) as { clientName?: string; city?: string; phone?: string };
      if (saved.clientName) setClientName(saved.clientName);
      if (saved.city) setCity(saved.city);
      if (saved.phone) setPhone(saved.phone);
    } catch {
      /* contacto anterior ilegible */
    }
  }, []);

  if (!isDrawerOpen) return null;

  const handleWhatsAppSend = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) {
      setPhoneError("Ingresa un celular de al menos 9 dígitos para poder contactarte.");
      return;
    }
    if (!privacyAccepted) {
      toast.error("Debes aceptar la política de privacidad para enviar la cotización.");
      return;
    }
    setPhoneError("");
    setSending(true);
    try {
      const saved = await submitQuote(clientName, city, phone.trim());
      if (!saved?.code) {
        toast.error("No se pudo registrar la cotización. Revisa el celular e inténtalo de nuevo.");
        return;
      }
      try {
        localStorage.setItem("apolo_quote_contact", JSON.stringify({ clientName, city, phone: phone.trim() }));
      } catch {
        /* el navegador puede bloquear el almacenamiento */
      }
      const url = generateWhatsAppUrl(clientName, city, saved.code, phone.trim());
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity cursor-pointer"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-card border-l border-border shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="px-6 py-5 border-b border-border bg-muted/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  Lista de Cotización
                  {totalCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-primary text-primary-foreground">
                      {totalCount}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {totalCount > 0
                    ? `${totalUnits} ${totalUnits === 1 ? "unidad" : "unidades"} en total para cotizar`
                    : "Selecciona los lubricantes de tu interés"}
                </p>
              </div>
            </div>

            <button
              onClick={closeDrawer}
              className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors cursor-pointer"
              aria-label="Cerrar lista de cotización"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 space-y-4">
                <div className="w-20 h-20 rounded-full bg-muted/60 border border-border flex items-center justify-center text-muted-foreground shadow-inner">
                  <ShoppingBag className="w-10 h-10 opacity-60" />
                </div>
                <div className="space-y-1.5 max-w-xs">
                  <h3 className="text-base font-bold text-foreground">
                    Tu lista está vacía
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Navega por nuestro catálogo y presiona el botón{" "}
                    <strong className="text-primary font-semibold">"Cotizar"</strong>{" "}
                    en los aceites, lubricantes o fluidos que desees cotizar por WhatsApp.
                  </p>
                </div>
                <Link
                  href="/productos"
                  onClick={closeDrawer}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition-all cursor-pointer active:scale-95"
                >
                  <span>Explorar Catálogo de Productos</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Productos Seleccionados ({items.length})
                  </span>
                  <button
                    onClick={clearQuote}
                    className="text-xs text-muted-foreground hover:text-red-500 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Vaciar lista</span>
                  </button>
                </div>

                {items.map((item, idx) => {
                  const isApolo = (item.brand || "").toLowerCase() === "apolo";
                  const isOverts = (item.brand || "").toLowerCase() === "overts";
                  const isValtrom = (item.brand || "").toLowerCase() === "valtrom";
                  const hasImage = Boolean(
                    item.image && item.image.trim() !== "" && item.image !== "/placeholder.svg"
                  );

                  return (
                    <div
                      key={`${item.id}-${item.presentation || idx}`}
                      className="group/item relative rounded-2xl border border-border bg-card p-3.5 shadow-xs hover:border-primary/40 transition-all duration-200"
                    >
                      <div className="flex gap-3.5 items-center">
                        {/* Miniatura del producto */}
                        <div className="w-16 h-16 rounded-xl bg-white border border-border/40 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                          {hasImage ? (
                            <div className="relative w-full h-full">
                              <Image
                                src={item.image!}
                                alt={item.name}
                                fill
                                sizes="64px"
                                className="object-contain object-center"
                              />
                            </div>
                          ) : (
                            <Package className="w-7 h-7 text-primary opacity-60" />
                          )}
                        </div>

                        {/* Detalles */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span
                              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                                isApolo
                                  ? "bg-red-600/15 text-red-500 border-red-500/30"
                                  : isOverts
                                  ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                                  : isValtrom
                                  ? "bg-purple-600/15 text-purple-400 border-purple-500/30"
                                  : "bg-blue-600/15 text-blue-400 border-blue-500/30"
                              }`}
                            >
                              {item.brand || "Apolo"}
                            </span>

                            {item.presentation && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border">
                                {item.presentation}
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs font-bold text-foreground truncate max-w-[200px]" title={item.name}>
                            {item.name}
                          </h4>

                          {item.line && (
                            <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                              {item.line}
                            </p>
                          )}
                        </div>

                        {/* Controles de cantidad y eliminar */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <button
                            onClick={() => removeItem(item.id, item.presentation)}
                            className="text-muted-foreground/60 hover:text-red-500 p-2.5 -m-1 rounded-md transition-colors cursor-pointer"
                            title="Quitar de la cotización"
                            aria-label={`Quitar ${item.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <div className="flex items-center border border-border rounded-lg bg-muted/40 p-0.5">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1, item.presentation)}
                              className="w-9 h-9 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer"
                              title="Disminuir cantidad"
                              aria-label={`Disminuir cantidad de ${item.name}`}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-7 text-center text-xs font-bold text-foreground font-mono">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1, item.presentation)}
                              className="w-9 h-9 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer"
                              title="Aumentar cantidad"
                              aria-label={`Aumentar cantidad de ${item.name}`}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer with WhatsApp CTA */}
          {items.length > 0 && (
            <div className="p-6 border-t border-border bg-muted/30 space-y-4">
              {/* Optional Client inputs for more tailored message */}
              <div className="space-y-2.5 bg-card border border-border/80 rounded-xl p-3 shadow-xs">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-primary" />
                  Datos para contactarte
                </p>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (phoneError) setPhoneError("");
                    }}
                    placeholder="Celular (obligatorio)"
                    aria-invalid={Boolean(phoneError)}
                    aria-describedby={phoneError ? "quote-phone-error" : undefined}
                    className={`w-full pl-8 pr-2.5 py-2 text-xs rounded-lg border bg-muted/40 text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors ${
                      phoneError ? "border-red-500 focus:border-red-500" : "border-border focus:border-primary"
                    }`}
                  />
                </div>
                {phoneError ? (
                  <p id="quote-phone-error" className="text-[11px] font-medium text-red-500">
                    {phoneError}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Lo usamos para llamarte o escribirte por WhatsApp.</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Tu nombre / Empresa"
                      autoComplete="name"
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Ciudad / Destino"
                      autoComplete="address-level2"
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>Total de productos:</span>
                <span className="font-bold text-foreground">
                  {items.length} ({totalUnits} {totalUnits === 1 ? "unidad" : "unidades"})
                </span>
              </div>

              <label className="flex items-start gap-2 text-[11px] leading-snug text-muted-foreground px-1">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                />
                <span>
                  Acepto el tratamiento de mis datos según la{" "}
                  <Link href="/privacidad" className="text-primary underline-offset-2 hover:underline">
                    política de privacidad
                  </Link>
                  .
                </span>
              </label>

              {/* WhatsApp Button */}
              <button
                onClick={handleWhatsAppSend}
                disabled={sending || items.length === 0 || !privacyAccepted}
                className="w-full py-3.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/25 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-60"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.993.589 1.954.91 2.796.91h.005c3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.586-5.767-5.773-5.767zm7.643 5.767c0 4.218-3.431 7.649-7.648 7.649-.001 0-.003 0-.005 0-1.328 0-2.613-.357-3.738-1.026l-4.148 1.088 1.107-4.041c-.736-1.164-1.127-2.511-1.127-3.896 0-4.218 3.43-7.648 7.648-7.648 4.218 0 7.911 3.654 7.911 7.874z" />
                </svg>
                <span>{sending ? "Guardando..." : "Cotizar por WhatsApp"}</span>
              </button>

              <p className="text-[11px] text-center text-muted-foreground leading-snug">
                Se abrirá WhatsApp con el listado ordenado de tus productos listo para enviar.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
