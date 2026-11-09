# Decisions

## [DEC-001] Supabase como backend de datos/auth
- **Date**: 2026 (migración commits `6569cfc`, `0634990`)
- **Choice**: Postgres/Auth/Storage Supabase; drop MySQL product APIs
- **Reason**: Stack unificado con RLS y SSR cookies
- **Alternatives**: MySQL legacy + APIs propias
- **Trade-offs**: Dependencia de políticas RLS correctas en prod
- **Files affected**: `lib/supabase-*.ts`, `supabase_*.sql`, `scripts/migrate_mysql_to_supabase.js`

## [DEC-002] products.id como text
- **Date**: ver `supabase_products_alter.sql`
- **Choice**: PK texto (`prod-...`) en lugar de uuid
- **Reason**: Compatibilidad con IDs de la app/migración
- **Alternatives**: uuid nativo
- **Trade-offs**: FKs y tipos deben ser text consistentemente
- **Files affected**: `supabase_products_alter.sql`, admin productos

## [DEC-003] CMS parcial en tabla pages
- **Date**: uso actual en lib helpers
- **Choice**: Persistir banners/carruseles/líneas/festivo vía `pages` content
- **Reason**: Flexibilidad sin tablas extra por feature UI
- **Alternatives**: tablas dedicadas por entidad
- **Trade-offs**: Contratos JSON implícitos en helpers
- **Files affected**: `lib/banners-data.ts`, `lib/carousel-items.ts`, `lib/product-line-groups.ts`, `lib/festive-theme.ts`

## [DEC-004] Memoria Cursor en docs + rules + .cursor/memory
- **Date**: 2026-11-07
- **Choice**: Documentación técnica en `docs/`; reglas `.mdc`; memoria corta en `.cursor/memory/`
- **Reason**: Reducir re-análisis y tokens en sesiones nuevas
- **Alternatives**: Solo README
- **Trade-offs**: Hay que mantener docs al día
- **Files affected**: `AGENTS.md`, `docs/*`, `.cursor/**`

## [DEC-005] Sync 2026-11-09 por fast-forward
- **Date**: 2026-11-09
- **Choice**: `git pull --ff-only` de `0634990` a `4368cc6`. No se reintrodujo Nodemailer.
- **Reason**: local iba 0 adelante / 2 atrás; el remoto ya reemplazó Gmail por Resend
- **Alternatives**: merge con memoria local sin trackear, o restaurar SMTP
- **Trade-offs**: el formulario de contacto local falla hasta configurar `RESEND_API_KEY`
- **Files affected**: árbol completo del pull; `.env.local` no se tocó
