"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  FestiveConfig,
  FestiveTheme,
  DEFAULT_FESTIVE_CONFIG,
  getFestiveConfig,
  saveFestiveConfig,
  fetchRemoteFestiveConfig,
  getActiveTheme,
  getAllThemes,
  shouldApplyRemoteConfig,
  FESTIVE_STORAGE_KEY,
  FESTIVE_THEME_PAGE_SLUG,
} from "@/lib/festive-theme";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { realtimeBus } from "@/lib/realtime-bus";
import { toast } from "sonner";

export function useFestiveTheme() {
  const [config, setConfig] = useState<FestiveConfig>(DEFAULT_FESTIVE_CONFIG);
  const [mounted, setMounted] = useState(false);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    setMounted(true);
    const initial = getFestiveConfig();
    setConfig(initial);

    fetchRemoteFestiveConfig().then((remote) => {
      if (remote && shouldApplyRemoteConfig(configRef.current, remote)) {
        setConfig(remote);
      }
    });

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
              if (remote && shouldApplyRemoteConfig(configRef.current, remote)) {
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

    let unsubscribeBus: (() => void) | null = null;
    if (realtimeBus) {
      unsubscribeBus = realtimeBus.on("festive_theme_updated", (newConfig: FestiveConfig) => {
        if (newConfig && shouldApplyRemoteConfig(configRef.current, newConfig)) {
          setConfig(newConfig);
        }
      });
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === FESTIVE_STORAGE_KEY) {
        const next = getFestiveConfig();
        if (shouldApplyRemoteConfig(configRef.current, next)) {
          setConfig(next);
        }
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

  const updateConfig = useCallback(async (updater: (prev: FestiveConfig) => FestiveConfig) => {
    const prev = configRef.current;
    const next: FestiveConfig = {
      ...updater(prev),
      updatedAt: Date.now(),
    };
    // El ref se actualiza ya, para que un segundo guardado encadene el primero.
    configRef.current = next;
    setConfig(next);
    const result = await saveFestiveConfig(next);
    if (!result.success) {
      configRef.current = prev;
      setConfig(prev);
      toast.error("No se pudo guardar la temática en Supabase", {
        description: result.error || "¿Estás logueado como admin?",
      });
      return false;
    }
    return true;
  }, []);

  const setGlobalEnabled = useCallback(
    async (enabled: boolean) => {
      return updateConfig((prev) => ({
        ...prev,
        globalEnabled: enabled,
      }));
    },
    [updateConfig]
  );

  const selectActiveTheme = useCallback(
    async (themeId: string) => {
      return updateConfig((prev) => ({
        ...prev,
        activeThemeId: themeId,
        globalEnabled: true,
      }));
    },
    [updateConfig]
  );

  const saveCustomTheme = useCallback(
    async (theme: FestiveTheme) => {
      return updateConfig((prev) => {
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
    },
    [updateConfig]
  );

  const removeThemeOverride = useCallback(
    async (themeId: string) => {
      return updateConfig((prev) => ({
        ...prev,
        customThemes: prev.customThemes.filter((theme) => theme.id !== themeId),
      }));
    },
    [updateConfig]
  );

  const deleteCustomTheme = useCallback(
    async (themeId: string) => {
      return updateConfig((prev) => ({
        ...prev,
        customThemes: prev.customThemes.filter((t) => t.id !== themeId),
        activeThemeId:
          prev.activeThemeId === themeId ? "dia-de-la-bandera" : prev.activeThemeId,
      }));
    },
    [updateConfig]
  );

  const activeTheme = mounted ? getActiveTheme(config) : null;
  const allThemes = getAllThemes(config);

  return {
    config,
    activeTheme,
    allThemes,
    isFestiveActive: Boolean(mounted && config.globalEnabled && activeTheme),
    setGlobalEnabled,
    ready: mounted,
    selectActiveTheme,
    saveCustomTheme,
    deleteCustomTheme,
    removeThemeOverride,
  };
}
