"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ImageProtection() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") || pathname?.startsWith("/admin-login");

  useEffect(() => {
    // Si estamos en cualquier ruta de administración, no restringir nada
    if (isAdmin) {
      document.body.classList.remove("protect-images");
      return;
    }

    document.body.classList.add("protect-images");

    // Función auxiliar para determinar si un elemento es o contiene una imagen
    const isImageElement = (el: HTMLElement | null): boolean => {
      if (!el) return false;
      if (
        el.tagName === "IMG" ||
        el.tagName === "PICTURE" ||
        el.getAttribute("role") === "img" ||
        el.closest("img") ||
        el.closest("picture")
      ) {
        return true;
      }
      return !!el.querySelector("img");
    };

    // 2. Bloquear menú contextual (click derecho en desktop o mantener pulsado en móvil)
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (
        target.tagName === "IMG" ||
        target.tagName === "PICTURE" ||
        target.getAttribute("role") === "img" ||
        target.closest("img") ||
        target.closest("picture")
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Si el click fue en un contenedor o enlace envolvente y coincide con las coordenadas de la foto
      const imgChild = target.querySelector("img");
      if (imgChild) {
        const rect = imgChild.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    // 3. Bloquear evento dragstart (Universal: Firefox, Chrome, Safari, Edge, etc.)
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      if (isImageElement(target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // 4. Bloquear atajo de teclado Ctrl+S / Cmd+S (Guardar página completa con todas las fotos)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
      }
    };

    // 5. Prevenir copiado de imágenes al portapapeles
    const handleCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (isImageElement(target)) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu, { capture: true });
    document.addEventListener("dragstart", handleDragStart, { capture: true });
    document.addEventListener("keydown", handleKeyDown, { capture: true });
    document.addEventListener("copy", handleCopy, { capture: true });

    return () => {
      document.body.classList.remove("protect-images");
      document.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      document.removeEventListener("dragstart", handleDragStart, { capture: true });
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
      document.removeEventListener("copy", handleCopy, { capture: true });
    };
  }, [isAdmin, pathname]);

  return null;
}
