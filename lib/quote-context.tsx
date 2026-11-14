"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

export interface QuoteItem {
  id: string;
  name: string;
  brand: string;
  presentation?: string;
  line?: string;
  viscosity?: string;
  code?: string;
  image?: string;
  quantity: number;
}

type QuoteProductInput = {
  id?: string;
  name?: string;
  brand?: string;
  presentation?: string;
  line?: string;
  short_description?: string;
  viscosity?: string;
  code?: string;
  slug?: string;
  image?: string;
  image_url?: string;
};

interface QuoteContextType {
  items: QuoteItem[];
  addItem: (product: QuoteProductInput, quantity?: number) => void;
  removeItem: (id: string, presentation?: string) => void;
  updateQuantity: (id: string, quantity: number, presentation?: string) => void;
  clearQuote: () => void;
  totalCount: number;
  totalItems: number;
  totalUnits: number;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  generateWhatsAppUrl: (clientName?: string, city?: string, quoteCode?: string, phone?: string) => string;
  submitQuote: (clientName?: string, city?: string, phone?: string) => Promise<{ code: string } | null>;
}

const QuoteContext = createContext<QuoteContextType | null>(null);

const STORAGE_KEY = "apolo_quote_items_v1";

export function QuoteProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { settings } = useBusinessSettings();

  // Load from localStorage after client mount to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch (e) {
      console.error("Error loading quote items from localStorage:", e);
    }
  }, []);

  // Sync to localStorage
  const persistItems = useCallback((updater: (prev: QuoteItem[]) => QuoteItem[]) => {
    setItems((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error("Error saving quote items to localStorage:", e);
      }
      return next;
    });
  }, []);

  // Add item
  const addItem = useCallback(
    (product: QuoteProductInput, quantity = 1) => {
      if (!product || !product.name) return;

      const normPres = (product.presentation || "").trim().toLowerCase();
      const validQty = Math.max(1, quantity);

      persistItems((prev) => {
        const existingIndex = prev.findIndex(
          (item) =>
            item.id === product.id &&
            (item.presentation || "").trim().toLowerCase() === normPres
        );

        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + validQty,
          };
          toast.success(`Se aumentó la cantidad de "${product.name}" a ${updated[existingIndex].quantity}`, {
            description: product.presentation ? `Presentación: ${product.presentation}` : undefined,
          });
          return updated;
        }

        const newItem: QuoteItem = {
          id: product.id || `quote-${Date.now()}`,
          name: product.name || "Producto",
          brand: product.brand || "Apolo",
          presentation: product.presentation || undefined,
          line: product.line || product.short_description || undefined,
          viscosity: product.viscosity || undefined,
          code: product.code || product.slug || undefined,
          image: product.image || product.image_url || "/placeholder.svg",
          quantity: validQty,
        };

        toast.success(`"${product.name}" agregado a tu cotización`, {
          description: product.presentation ? `Presentación: ${product.presentation}` : undefined,
          action: {
            label: "Ver Lista",
            onClick: () => setIsDrawerOpen(true),
          },
        });

        return [newItem, ...prev];
      });
    },
    [persistItems]
  );

  // Remove item
  const removeItem = useCallback(
    (id: string, presentation?: string) => {
      const normPres = (presentation || "").trim().toLowerCase();
      persistItems((prev) =>
        prev.filter(
          (item) =>
            !(
              item.id === id &&
              (item.presentation || "").trim().toLowerCase() === normPres
            )
        )
      );
      toast.info("Producto removido de la cotización");
    },
    [persistItems]
  );

  // Update quantity
  const updateQuantity = useCallback(
    (id: string, quantity: number, presentation?: string) => {
      const normPres = (presentation || "").trim().toLowerCase();
      if (quantity <= 0) {
        removeItem(id, presentation);
        return;
      }

      persistItems((prev) =>
        prev.map((item) => {
          if (
            item.id === id &&
            (item.presentation || "").trim().toLowerCase() === normPres
          ) {
            return { ...item, quantity };
          }
          return item;
        })
      );
    },
    [persistItems, removeItem]
  );

  // Clear quote
  const clearQuote = useCallback(() => {
    persistItems(() => []);
    toast.info("Lista de cotización vaciada");
  }, [persistItems]);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const totalCount = useMemo(() => items.length, [items]);
  const totalUnits = useMemo(
    () => items.reduce((acc, curr) => acc + (curr.quantity || 1), 0),
    [items]
  );

  // Generate WhatsApp formatted URL
  const generateWhatsAppUrl = useCallback(
    (clientName?: string, city?: string, quoteCode?: string, phone?: string) => {
      const cleanPhone = (settings.whatsapp || settings.phone || "51958400028").replace(/[^0-9]/g, "");

      if (items.length === 0) {
        return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
          "Hola, quisiera solicitar información y cotización sobre sus lubricantes."
        )}`;
      }

      const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

      let message = `Hola, quisiera hacer la siguiente Cotizacion de productos:\n\n`;
      if (quoteCode) {
        message += `🔖 *Código:* ${quoteCode}\n`;
        message += `🔗 Seguimiento: ${(typeof window !== "undefined" ? window.location.origin : "")}/cotizacion/${quoteCode}\n\n`;
      }
      message += `📋 *LISTA DE PRODUCTOS SELECCIONADOS*\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      items.forEach((item, index) => {
        const num = numberEmojis[index] || `*#${index + 1}*`;
        message += `${num} *${item.name}*\n`;
        message += `   • *Marca:* ${item.brand || "Apolo"}\n`;
        if (item.presentation) {
          message += `   • *Presentación:* ${item.presentation}\n`;
        }
        if (item.viscosity) {
          message += `   • *Viscosidad:* SAE ${item.viscosity}\n`;
        }
        if (item.line) {
          message += `   • *Línea:* ${item.line}\n`;
        }
        message += `   • *Cantidad:* ${item.quantity} ${item.quantity === 1 ? "unidad" : "unidades"}\n\n`;
      });

      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `📦 *Total de ítems:* ${items.length} (${totalUnits} unidades en total)\n`;

      if (clientName && clientName.trim()) {
        message += `👤 *Cliente / Empresa:* ${clientName.trim()}\n`;
      }
      if (phone && phone.trim()) {
        message += `📱 *Celular:* ${phone.trim()}\n`;
      }
      if (city && city.trim()) {
        message += `📍 *Ciudad / Destino:* ${city.trim()}\n`;
      }

      message += `\nQuedo a la espera de su cotización de precios y disponibilidad. ¡Muchas gracias!`;

      return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    },
    [items, totalUnits, settings]
  );

  const submitQuote = useCallback(
    async (clientName?: string, city?: string, phone?: string) => {
      if (items.length === 0) return null;
      const cleanPhone = phone?.trim() || "";
      if (cleanPhone.replace(/\D/g, "").length < 9) return null;
      try {
        const res = await fetch("/api/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientName: clientName?.trim() || undefined,
            city: city?.trim() || undefined,
            phone: cleanPhone,
            items,
          }),
        });
        if (!res.ok) {
          console.warn("No se pudo persistir cotización", await res.text());
          return null;
        }
        const data = await res.json();
        return data?.code ? { code: String(data.code) } : null;
      } catch (e) {
        console.warn("submitQuote error", e);
        return null;
      }
    },
    [items]
  );

  return (
    <QuoteContext.Provider
      value={{
        items: mounted ? items : [],
        addItem,
        removeItem,
        updateQuantity,
        clearQuote,
        totalCount: mounted ? totalCount : 0,
        totalItems: mounted ? totalCount : 0,
        totalUnits: mounted ? totalUnits : 0,
        isDrawerOpen,
        setIsDrawerOpen,
        openDrawer,
        closeDrawer,
        generateWhatsAppUrl,
        submitQuote,
      }}
    >
      {children}
    </QuoteContext.Provider>
  );
}

export function useQuote() {
  const context = useContext(QuoteContext);
  if (!context) {
    throw new Error("useQuote debe ser usado dentro de un QuoteProvider");
  }
  return context;
}
