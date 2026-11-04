"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FestiveConfig,
  FestiveTheme,
  DEFAULT_FESTIVE_CONFIG,
  getFestiveConfig,
  saveFestiveConfig,
  fetchRemoteFestiveConfig,
  getActiveTheme,
  getAllThemes,
  FESTIVE_STORAGE_KEY,
  FESTIVE_THEME_PAGE_SLUG,
} from "@/lib/festive-theme";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { realtimeBus } from "@/lib/realtime-bus";

export function useFestiveTheme() {
  const [config, setConfig] = useState<FestiveConfig>(DEFAULT_FESTIVE_CONFIG);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const initial = getFestiveConfig();
    setConfig(initial);

    // Consulta remota a Supabase (para celulares)
    fetchRemoteFestiveConfig().then((remote) => {
      if (remote) {
        setConfig(remote);
      }
    });

    // Escuchar eventos en Supabase Realtime (con canal único y protegido contra excepciones)
    const supabase = createBrowserSupabase();
    let channel: any = null;
    try {
      const channelId = `realtime:festive_theme_${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "pages",
            filter: `slug=eq.${FESTIVE_THEME_PAGE_SLUG}`,
          },
          async () => {
            try {
              const remote = await fetchRemoteFestiveConfig();
              if (remote) {
                setConfig(remote);
              }
            } catch (err) {
              console.warn("Error fetching remote festive config:", err);
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("Supabase Realtime festive channel error:", err);
    }

    // Escuchar eventos en vivo del BroadcastChannel
    let unsubscribeBus: (() => void) | null = null;
    if (realtimeBus) {
      unsubscribeBus = realtimeBus.on("festive_theme_updated", (newConfig: FestiveConfig) => {
        if (newConfig) {
          setConfig(newConfig);
        }
      });
    }

    // Escuchar eventos de Storage entre ventanas del navegador
    const handleStorage = (e: StorageEvent) => {
      if (e.key === FESTIVE_STORAGE_KEY) {
        setConfig(getFestiveConfig());
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      if (unsubscribeBus) unsubscribeBus();
      window.removeEventListener("storage", handleStorage);
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, []);

  const updateConfig = useCallback((updater: (prev: FestiveConfig) => FestiveConfig) => {
    setConfig((prev) => {
      const next = updater(prev);
      // Ejecutar persistencia de forma asíncrona fuera del ciclo de renderizado de React
      setTimeout(() => {
        saveFestiveConfig(next);
      }, 0);
      return next;
    });
  }, []);

  const setGlobalEnabled = useCallback((enabled: boolean) => {
    updateConfig((prev) => ({
      ...prev,
      globalEnabled: enabled,
    }));
  }, [updateConfig]);

  const selectActiveTheme = useCallback((themeId: string) => {
    updateConfig((prev) => ({
      ...prev,
      activeThemeId: themeId,
      globalEnabled: true, // Si selecciona una temática directamente, la activa
    }));
  }, [updateConfig]);

  const saveCustomTheme = useCallback((theme: FestiveTheme) => {
    updateConfig((prev) => {
      const existingIdx = prev.customThemes.findIndex((t) => t.id === theme.id);
      let updatedCustom: FestiveTheme[];
      if (existingIdx >= 0) {
        updatedCustom = [...prev.customThemes];
        updatedCustom[existingIdx] = theme;
      } else {
        updatedCustom = [...prev.customThemes, theme];
      }
      return {
        ...prev,
        customThemes: updatedCustom,
      };
    });
  }, [updateConfig]);

  const deleteCustomTheme = useCallback((themeId: string) => {
    updateConfig((prev) => ({
      ...prev,
      customThemes: prev.customThemes.filter((t) => t.id !== themeId),
      activeThemeId: prev.activeThemeId === themeId ? "dia-de-la-bandera" : prev.activeThemeId,
    }));
  }, [updateConfig]);

  const activeTheme = mounted ? getActiveTheme(config) : null;
  const allThemes = getAllThemes(config);

  return {
    config,
    activeTheme,
    allThemes,
    isFestiveActive: Boolean(mounted && config.globalEnabled && activeTheme),
    setGlobalEnabled,
    selectActiveTheme,
    saveCustomTheme,
    deleteCustomTheme,
  };
}
