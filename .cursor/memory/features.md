# Features

## Completed
- Legales 2026-11-12: `/cookies`, banner consentimiento, Analytics condicional, privacidad LOADP, checkbox en cotización/contacto
- Bajas 2026-11-12: roles editor/vendor en UI + SQL staff; seed proveedores; tests flujo quote/catálogo; flotantes móvil sin tapar hero
- Medias 2026-11-12: LCP priority/eager; dedupe carrusel destacados; CI lint bloqueante + eslint-config-next; modularización parcial admin/productos + products (`lib/admin/*`, `hooks/use-public-catalog.ts`, `lib/catalog/*`, `CatalogPager`, `SortableProductRow`)
- SEO: robots/sitemap, OG/Twitter, JSON-LD Organization, metadata por página — `app/robots.ts`, `app/sitemap.ts`, `app/layout.tsx`, `lib/site-url.ts` (2026-11-12)
- Catálogo público sin flash estático; skeleton hasta Supabase — `components/products.tsx` (2026-11-12)
- Gate `/admin` con sesión + role admin — `proxy.ts` (2026-11-12)
- Legales `/terminos` y `/privacidad` enlazados desde el footer (2026-11-12)
- Storefront home/productos/detalle/nosotros/contacto/cotización por código — `app/**`
- Admin módulos sidebar (productos, marcas, líneas, inventario, quotes, etc.) — `app/admin/**`. Tema del panel en `apolo-admin-theme` (claro, oscuro, sistema), aparte del tema de la tienda.
- Líneas de catálogo paginadas (8) con orden del menú — `app/admin/lineas/page.tsx`
- Alerta de bajo stock compartida (`isLowStock`) entre dashboard, `/admin/productos?stock=bajo` e `/admin/inventario`. El stock se escribe con `adjustStock` y solo cuenta si la fila vuelve confirmada
- Auth login + OAuth callback — `AdminLoginForm`, `app/auth/callback`
- API quotes / contact / chat / set-cookie — `app/api/**`
- SQL schema + RLS secure scripts — `supabase_*.sql`
- Memoria/docs Cursor — `docs/`, `.cursor/rules/`, `.cursor/memory/` (2026-11-07)
- Sync local → `origin/main` `4368cc6` (2026-11-09), fast-forward sin conflictos
- Ops local 2026-11-05 (previo al sync): seed catálogo, 144 imágenes en bucket `products`, RLS secure aplicado, dedupe de 5 productos, 437 placeholders, 23 `image_url` rotas limpiadas

- Home rediseño 2026-11-11: tokens gold, Oswald, vitrinas, bento parallax, footer CTA — `components/home/*`, `header.tsx`, `footer.tsx`, `app/globals.css`
- Home pulido 2026-11-11: Lenis (`components/smooth-scroll.tsx`), storefront no pisa `--primary`, catálogos magazine, vitrinas `layoutId` — `hero.tsx`, `category-models.tsx`, `product-row.tsx`
- Home 2026-11-11: protección sin HUD (Ken Burns + velo + sheen); vitrinas con autoplay/shine/glow — `protection-section.tsx`, `product-row.tsx`, `app/globals.css`
- Catálogo 2026-11-11: sticky búsqueda/filtros, paginación 24, viscosidad, quick view compacto (sin cambiar URL), relacionadas misma marca — `components/products.tsx`, `components/catalog/*`, `lib/product-related.ts`
- Diseño 2026-11-11: modo claro en blanco, rojo `#C90012`, grafito `#171A20`, gris y oro `#FFD000` (`html.light`). La estructura del inicio no cambia. El oscuro no cambia. Admin conserva `apolo-admin-theme`
- Home scroll 2026-11-11: entradas de ~64px, línea dorada y paralaje en hero, líneas, protección, vitrinas, bento, CTA y marcas — `components/home/scroll-reveal.tsx`, `hero.tsx`
- Home acabado 2026-11-11: stats fuera del slide, flotantes compactos, sin rayas gruesas — `hero.tsx`, `stats-bar.tsx`, `FloatingWhatsApp.tsx`, `FloatingQuoteButton.tsx`
- Vitrinas 2026-11-11: vendidos, populares y recomendados en un escenario de tres tarjetas — `components/home/featured-showcase.tsx`

## In Progress
- Alta de producto simplificada (foto, nombre, marca, presentación, stock). Viscosidad, línea, categoría y grupo se deducen del nombre. 2026-11-09. `app/admin/productos/page.tsx`, `components/MediaSelector.tsx`

## Planned
- Aplicar `supabase_staff_roles.sql` en el proyecto Supabase
- Seguir extrayendo UI de `products.tsx` (Sidebar/ProductCard) y resto de admin monolítico
- Playwright E2E de navegador (opcional)
- Endurecer warnings ESLint (`any`, static-components) hacia error

## Deprecated
- APIs MySQL de productos — eliminadas en commit `6569cfc`
