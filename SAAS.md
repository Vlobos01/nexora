# Nexora → SaaS (nota de decisión)

**Decisión (agosto 2026):** en el futuro Nexora evolucionará a SaaS multi-tenant usando
[**Convex**](https://convex.dev) como backend (base de datos + auth + serverless functions + storage).

## Estado actual

- PWA 100% cliente: React 19 + TypeScript + Vite, datos en `localStorage` (`src/lib/storage.ts`),
  nunca se envían a internet. Frontend estático en Vercel.

## Por qué Convex

- Mejor relación precio/calidad/escalabilidad evaluada para este caso (3 búsquedas, julio 2026).
- Auto-escala serverless: de 10 a miles de clientes sin ops.
- Sync reactivo pensado para arquitecturas offline-first (localStorage local + nube como respaldo).
- TypeScript nativo: los tipos de `src/types.ts` se integran directo.
- Auth incluida → cuentas de usuario y aislamiento por cliente (multi-tenancy) sin servidor propio.

## Plan de migración (cuando se decida arrancar)

1. Crear cuenta/deploy en Convex y configurar env vars (`CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`).
2. Abstraer la capa de persistencia: `useLocalStorage` queda como fuente local; Convex sincroniza por usuario.
3. Agregar login (auth de Convex) y aislamiento de datos por usuario.
4. Mantener la PWA offline-first: la nube es respaldo + portabilidad entre dispositivos.
5. Más adelante: billing/suscripciones.

## Alternativas consideradas (y por qué no)

- **Supabase**: muy bueno (Postgres + auth, ~USD 25/mes Pro), pero sync offline requiere PowerSync (capa extra).
- **Neon**: Postgres serverless barato, sin auth ni funciones incluidas → más laburo propio.
- **Firebase**: offline nativo, pero NoSQL y vendor lock-in.
- **Hostinger VPS**: más barato a escala (USD 6-26/mes), pero autoadministrado (backups/seguridad/DevOps propios).
- Hostinger puede ser destino de migración cuando haya 50-100+ clientes pagos y el ahorro justifique la administración.
