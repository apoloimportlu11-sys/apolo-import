"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Box } from "lucide-react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": any;
    }
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": any;
    }
  }
}

// Componente tipado para evitar advertencias de JSX.IntrinsicElements en el editor
const ModelViewer = "model-viewer" as any;

interface ModelViewer3DProps {
  src: string;
  alt?: string;
  className?: string;
  autoRotate?: boolean;
}

export default function ModelViewer3D({
  src,
  alt = "Modelo 3D",
  className = "",
  autoRotate = true,
}: ModelViewer3DProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (customElements.get("model-viewer")) {
      setScriptReady(true);
      return;
    }

    const scriptId = "google-model-viewer-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.type = "module";
      script.src = "https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js";
      script.onload = () => setScriptReady(true);
      script.onerror = () => setError(true);
      document.head.appendChild(script);
    } else {
      if (customElements.get("model-viewer")) {
        setScriptReady(true);
      } else {
        script.addEventListener("load", () => setScriptReady(true));
      }
    }
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-4 text-center text-zinc-400 gap-2">
        <Box className="w-10 h-10 text-red-400" />
        <span className="text-xs font-semibold">No se pudo cargar el modelo 3D</span>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-transparent z-10 pointer-events-none">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <span className="text-[10px] text-zinc-400 font-mono">Cargando 3D...</span>
        </div>
      )}

      {scriptReady ? (
        <ModelViewer
          src={src}
          alt={alt}
          auto-rotate={autoRotate ? "" : undefined}
          rotation-per-second="30deg"
          camera-controls=""
          touch-action="pan-y"
          shadow-intensity="1.2"
          shadow-softness="0.8"
          exposure="1.1"
          interaction-prompt="none"
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setError(true);
            setLoaded(true);
          }}
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: "transparent",
            outline: "none",
          }}
        />
      ) : null}
    </div>
  );
}
