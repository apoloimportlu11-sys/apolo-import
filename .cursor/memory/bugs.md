# Bugs

## Open
### [BUG-001] Gate admin solo por cookie
- **Symptom**: `proxy.ts` redirige si no hay cookie `sb-*`; no comprueba rol admin
- **Root cause**: diseño actual del proxy
- **Files**: `proxy.ts`
- **Workaround**: RLS + checks en login/UI; usuarios no-admin pueden llegar a shell admin según flujos

### [BUG-002] ignoreBuildErrors
- **Symptom**: errores TypeScript no fallan el build
- **Root cause**: `typescript.ignoreBuildErrors: true` en `next.config.mjs`
- **Files**: `next.config.mjs`
- **Workaround**: revisar tipos localmente / CI no tipa estricto vía tsc

## Fixed
- (ninguno registrado en bootstrap de memoria)
