# Changelog

Registro de cambios importantes del producto y de la memoria del proyecto. Basado en `git log` y en esta configuración de documentación.

Formato: más reciente primero.

## 2026-11-07 — Resumen de mejoras y rediseño

- Añadido `docs/RESUMEN_MEJORAS.md`: vista corta de migración Supabase, panel comercial, rediseño UX admin, storefront y pendientes

## 2026-11-08 — Identidad visual del panel

- El administrador usa el rojo, el negro y el blanco de la tienda, con tema claro, oscuro o sistema
- El menú se agrupa por función, se puede contraer en escritorio y se abre como panel en móvil

## 2026-11-07 — Inventario para ajustar stock y mínimos

- `/admin/inventario` muestra cada producto con su foto, en páginas de 12, y guarda stock o mínimo con la misma alerta del dashboard
- El número se guarda solo y la base tiene que confirmar la fila; si no, el stock anterior sigue vigente
- Un mínimo en 0 no entra en la alerta. Los últimos ajustes salen de `inventory_movements`

## 2026-11-07 — Productos y alerta de bajo stock

- `/admin/productos` avisa con la misma regla del dashboard: producto activo con stock igual o menor al mínimo, si el mínimo es mayor que 0
- El dashboard abre esa lista. El catálogo se maneja de 20 en 20 y el stock muestra su mínimo

## 2026-11-07 — Líneas del admin con paginación

- `/admin/lineas` explica que el orden es el del menú y de los títulos del catálogo, y muestra cuántos productos caen en cada una
- La lista va de 8 en 8. Subir, bajar y arrastrar cambian el orden completo; un guardado fallido no deja la lista a medias

## 2026-11-07 — Marcas del admin más claras

- `/admin/marcas` explica que el nombre entra al crear productos y muestra cuántos productos lo usan
- Pausar, quitar y completar el catálogo ya no reemplazan logos ni confirman un guardado fallido

## 2026-11-07 — Configuración del admin más clara

- `/admin/configuracion` queda en Contacto, Apariencia y Carruseles, con el destino de cada dato y el guardado real
- El guardado de `business_settings` usa las columnas que existen; tamaño y fuente quedan en el navegador
- Una tarjeta de carrusel sin nombre o archivo no se publica

## 2026-11-07 — Memoria y documentación Cursor

- Añadidos `docs/*`, `.cursor/rules/*.mdc`, `.cursor/memory/*`
- Ampliado `AGENTS.md` (se conserva bloque Next.js agent rules)
- Sin cambios de funcionalidad de producto ni dependencias

## 2026-?? — Improve admin ops dashboard, brands UX, Resend contact, and Supabase hardening

- Commit: `5c476ac`
- Mejoras admin/ops, UX marcas, contacto Resend, endurecimiento Supabase (detalle en el diff del commit)

## 2026-?? — Migrate to new Supabase and expand admin commerce tooling

- Commit: `0634990`
- Migración a nuevo proyecto Supabase; expansión herramientas comercio admin

## 2026-?? — Sync storefront with Supabase and drop MySQL product APIs

- Commit: `6569cfc`
- Storefront sincronizado con Supabase; APIs MySQL de productos eliminadas

## Inicial — Storefront y admin Next.js

- Commit: `de2d057`
- Commit inicial del storefront y admin

> Fechas exactas de commits de producto no incluidas aquí; usar `git log --format=fuller` si se necesitan. Actualizar este archivo cuando haya releases o cambios arquitectónicos relevantes.
