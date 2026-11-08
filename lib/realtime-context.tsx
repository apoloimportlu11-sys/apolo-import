"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { realtimeBus } from "@/lib/realtime-bus";
import { toast } from "sonner";

export interface BusinessSettings {
  id?: string;
  business_name: string;
  phone: string;
  email: string;
  whatsapp: string;
  address: string;
  hours: string;
  maps_url: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_scale?: number;
  font_family?: "montserrat" | "inter" | "roboto";
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  business_name: "Apolo Lubricantes",
  phone: "+51 958 400 028",
  email: "apoloimportlu11@gmail.com",
  whatsapp: "+51 958 400 028",
  address: "Las flores SJL, Lima, Perú",
  hours: "Lun - Vie: 9:00 AM - 6:30 PM",
  mapsUrl: "https://www.google.com/maps?q=Las+flores+SJL&output=embed",
  maps_url: "https://www.google.com/maps?q=Las+flores+SJL&output=embed",
  logo_url: "/images/logoApolo.png",
  primary_color: "#C7940A",
  secondary_color: "#0E0E0E",
  accent_color: "#F5C542",
  font_scale: 100,
  font_family: "inter",
} as any;

const FONT_FAMILY_VARS: Record<string, string> = {
  montserrat: "var(--font-montserrat)",
  inter: "var(--font-inter)",
  roboto: "var(--font-roboto)",
};

function getContrastColor(hexColor: string): string {
  if (!hexColor || !hexColor.startsWith("#")) return "#FFFFFF";
  const hex = hexColor.replace("#", "");
  let r = 255, g = 255, b = 255;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? "#000000" : "#FFFFFF";
}

interface RealtimeContextType {
  settings: BusinessSettings;
  loading: boolean;
  isConnected: boolean;
  lastUpdated: Date | null;
  saveSettings: (newSettings: Partial<BusinessSettings>) => Promise<{ success: boolean; error?: string }>;
  applyThemeColors: (s: BusinessSettings) => void;
  refreshSettings: () => Promise<void>;
}

const RealtimeContext = createContext<RealtimeContextType>({
  settings: DEFAULT_BUSINESS_SETTINGS,
  loading: true,
  isConnected: false,
  lastUpdated: null,
  saveSettings: async () => ({ success: false }),
  applyThemeColors: () => {},
  refreshSettings: async () => {},
});

const SETTINGS_STORAGE_KEY = "apolo_cached_business_settings";
const SETTINGS_TS_KEY = "apolo_cached_business_settings_ts";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache to save Supabase free tier requests

export function BusinessSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_BUSINESS_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pathname = usePathname();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const supabase = createBrowserSupabase();

  // Apply colors to CSS custom properties dynamically across the entire application
  const applyThemeColors = useCallback((s: BusinessSettings) => {
    if (typeof document !== "undefined" && s) {
      const root = document.documentElement;
      if (s.primary_color) {
        root.style.setProperty("--primary", s.primary_color);
        root.style.setProperty("--primary-foreground", getContrastColor(s.primary_color));
        root.style.setProperty("--sidebar-primary", s.primary_color);
        root.style.setProperty("--sidebar-primary-foreground", getContrastColor(s.primary_color));
        root.style.setProperty("--ring", s.primary_color);
        root.style.setProperty("--chart-1", s.primary_color);
        root.style.setProperty("--brand-primary", s.primary_color);
      }
      if (s.accent_color) {
        root.style.setProperty("--accent", s.accent_color);
        root.style.setProperty("--accent-foreground", getContrastColor(s.accent_color));
        root.style.setProperty("--sb-accent", s.accent_color);
        root.style.setProperty("--chart-2", s.accent_color);
        root.style.setProperty("--brand-accent", s.accent_color);
      }
      if (s.secondary_color) {
        root.style.setProperty("--secondary", s.secondary_color);
        root.style.setProperty("--secondary-foreground", getContrastColor(s.secondary_color));
        root.style.setProperty("--brand-secondary", s.secondary_color);
      }

      // Tamaño de letra y tipografía: solo en el sitio público, nunca dentro de /admin
      // (para que el panel de gestión no cambie de tamaño mientras el admin trabaja ahí).
      const isAdminRoute = window.location.pathname.startsWith("/admin");
      if (isAdminRoute) {
        document.documentElement.style.fontSize = "";
        document.body.style.fontFamily = "";
      } else {
        document.documentElement.style.fontSize = `${s.font_scale || 100}%`;
        document.body.style.fontFamily = `${FONT_FAMILY_VARS[s.font_family || "inter"]}, sans-serif`;
      }
    }
  }, []);

  const updateLocalSettings = useCallback(
    (newSettings: BusinessSettings, source: "initial" | "realtime" | "save" = "initial") => {
      setSettings(newSettings);
      setLastUpdated(new Date());
      applyThemeColors(newSettings);

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
          localStorage.setItem(SETTINGS_TS_KEY, Date.now().toString());
        } catch (e) {
          // ignore storage error
        }
      }

      if (source === "realtime") {
        toast.info("Configuración actualizada en tiempo real", {
          description: `Cambios aplicados desde el panel (${new Date().toLocaleTimeString()})`,
          duration: 3000,
        });
      }
    },
    [applyThemeColors]
  );

  // Re-aplica (o limpia) el tamaño de letra / tipografía al cruzar entre rutas públicas y /admin
  // sin recarga completa (navegación cliente), ya que applyThemeColors depende del pathname actual.
  // Depende solo de `pathname`: los cambios de `settings` ya disparan applyThemeColors directamente
  // desde updateLocalSettings, así que no hace falta (ni conviene) duplicar esa llamada aquí.
  useEffect(() => {
    applyThemeColors(settingsRef.current);
  }, [pathname, applyThemeColors]);

  const fetchSettings = useCallback(async (force = false) => {
    // Check if we can serve from fresh cache to spare Supabase bandwidth
    if (!force && typeof window !== "undefined") {
      try {
        const lastTs = Number(localStorage.getItem(SETTINGS_TS_KEY) || 0);
        const cached = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (cached && Date.now() - lastTs < CACHE_TTL_MS) {
          const parsed = JSON.parse(cached);
          if (parsed && (!parsed.logo_url || String(parsed.logo_url).toLowerCase().includes("overts") || String(parsed.logo_url).toLowerCase().includes("live_site"))) {
            parsed.logo_url = "/images/logoApolo.png";
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(parsed));
          }
          updateLocalSettings(parsed, "initial");
          setLoading(false);
          return;
        }
      } catch (e) {}
    }

    try {
      const baseColumns = "id, business_name, phone, email, whatsapp, address, hours, maps_url, logo_url, primary_color, secondary_color, accent_color";
      const { data, error } = await supabase.from("business_settings").select(baseColumns).limit(1).maybeSingle();

      if (data && !error) {
        const cleanLogoUrl = (!data.logo_url || String(data.logo_url).toLowerCase().includes("overts") || String(data.logo_url).toLowerCase().includes("live_site"))
          ? "/images/logoApolo.png"
          : data.logo_url;

        const merged: BusinessSettings = {
          ...DEFAULT_BUSINESS_SETTINGS,
          ...data,
          business_name: data.business_name || DEFAULT_BUSINESS_SETTINGS.business_name,
          phone: data.phone || DEFAULT_BUSINESS_SETTINGS.phone,
          email: data.email || DEFAULT_BUSINESS_SETTINGS.email,
          whatsapp: data.whatsapp || DEFAULT_BUSINESS_SETTINGS.whatsapp,
          address: data.address || DEFAULT_BUSINESS_SETTINGS.address,
          hours: data.hours || DEFAULT_BUSINESS_SETTINGS.hours,
          maps_url: data.maps_url || DEFAULT_BUSINESS_SETTINGS.maps_url,
          logo_url: cleanLogoUrl,
          primary_color: data.primary_color || DEFAULT_BUSINESS_SETTINGS.primary_color,
          secondary_color: data.secondary_color || DEFAULT_BUSINESS_SETTINGS.secondary_color,
          accent_color: data.accent_color || DEFAULT_BUSINESS_SETTINGS.accent_color,
          font_scale: settingsRef.current.font_scale || DEFAULT_BUSINESS_SETTINGS.font_scale,
          font_family: settingsRef.current.font_family || DEFAULT_BUSINESS_SETTINGS.font_family,
        };
        updateLocalSettings(merged, "initial");
      }
    } catch (err) {
      console.error("Error fetching business_settings:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, updateLocalSettings]);

  useEffect(() => {
    // 0. Load cached settings from localStorage safely after mount
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          setSettings((prev) => ({ ...prev, ...parsed }));
          applyThemeColors({ ...DEFAULT_BUSINESS_SETTINGS, ...parsed });
        }
      } catch (e) {
        // ignore parse error
      }
    }

    fetchSettings();

    // 1. Listen on BroadcastChannel for instant local cross-tab sync
    let unsubscribeBus: (() => void) | null = null;
    if (realtimeBus) {
      unsubscribeBus = realtimeBus.on<BusinessSettings>("business_settings_updated", (payload) => {
        if (payload) {
          updateLocalSettings(payload, "realtime");
        }
      });
    }

    // 2. Subscribe to Supabase Realtime channel for remote database events
    const channel = supabase
      .channel("realtime:business_settings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "business_settings",
        },
        (payload) => {
          setIsConnected(true);
          if (payload.new && typeof payload.new === "object") {
            const updated = {
              ...DEFAULT_BUSINESS_SETTINGS,
              ...(payload.new as BusinessSettings),
            };
            updateLocalSettings(updated, "realtime");
          } else {
            fetchSettings();
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setIsConnected(false);
        }
      });

    return () => {
      if (unsubscribeBus) unsubscribeBus();
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchSettings, updateLocalSettings]);

  // Save settings with Optimistic UI + BroadcastChannel + Supabase write
  const saveSettings = useCallback(
    async (newValues: Partial<BusinessSettings>): Promise<{ success: boolean; error?: string }> => {
      const optimisticState: BusinessSettings = {
        ...settings,
        ...newValues,
        updated_at: new Date().toISOString(),
      };

      const previous = settings;

      // 1. Optimistic local update
      updateLocalSettings(optimisticState, "save");

      // 2. Broadcast immediately to other tabs
      if (realtimeBus) {
        realtimeBus.emit("business_settings_updated", optimisticState);
      }

      const baseRow = {
        business_name: optimisticState.business_name,
        phone: optimisticState.phone,
        email: optimisticState.email,
        whatsapp: optimisticState.whatsapp,
        address: optimisticState.address,
        hours: optimisticState.hours,
        maps_url: optimisticState.maps_url,
        logo_url: optimisticState.logo_url,
        primary_color: optimisticState.primary_color,
        secondary_color: optimisticState.secondary_color,
        accent_color: optimisticState.accent_color,
      };

      const writeRow = async (row: Record<string, unknown>) => {
        if (optimisticState.id) {
          return supabase.from("business_settings").update({ ...row, updated_at: new Date().toISOString() }).eq("id", optimisticState.id);
        }
        return supabase.from("business_settings").insert([row]).select().single();
      };

      try {
        const result = await writeRow(baseRow);

        if (result.error) {
          throw new Error(result.error.message || "Error al persistir en la base de datos");
        }

        if (!optimisticState.id && "data" in result && result.data && typeof result.data === "object" && "id" in result.data) {
          setSettings((prev) => ({ ...prev, id: String(result.data.id) }));
        }

        return { success: true };
      } catch (err: any) {
        updateLocalSettings(previous, "save");
        if (realtimeBus) realtimeBus.emit("business_settings_updated", previous);
        console.error("Failed to save business_settings:", err);
        return {
          success: false,
          error: err.message || "Error desconocido al guardar",
        };
      }
    },
    [settings, supabase, updateLocalSettings]
  );

  return (
    <RealtimeContext.Provider
      value={{
        settings,
        loading,
        isConnected,
        lastUpdated,
        saveSettings,
        applyThemeColors,
        refreshSettings: fetchSettings,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useBusinessSettings() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useBusinessSettings must be used within a BusinessSettingsProvider");
  }
  return context;
}
