# Cambiatón — Álbum Panini World Cup 2026

App para gestionar el álbum Panini Mundial 2026: marcar lo que tenés, ver
faltantes y repetidas, y proponer intercambios óptimos (cambiatón) con otros
coleccionistas.

- 990 stickers base (`XXX-NN` → equipo + número)
- 80 extras con variantes Regular/Bronce/Plata/Oro (`EX-NN-V`)
- Confederaciones CAF, AFC, UEFA, CONMEBOL, CONCACAF, OFC
- Multi-usuario: cada cuenta lleva su propia colección; el catálogo es global
- Auth simple email + password; alta automática al compartir lista vía link

## Stack

- **SvelteKit 2** + Svelte 5 (runes)
- **Cloudflare Pages** (SSR vía `@sveltejs/adapter-cloudflare`)
- **D1** (SQLite serverless) + **Drizzle ORM**
- Tailwind v4

En local: SQLite (`local.db`) con `better-sqlite3` para scripts y dev.
En producción: D1 inyectada por request, accedida vía `AsyncLocalStorage`
desde `src/lib/server/db/index.ts`.

## Dev local

```sh
pnpm install
pnpm db:push        # crea/actualiza local.db a partir del schema
pnpm db:seed        # carga datos desde Album_Panini_Mundial_2026.xlsx
pnpm dev
```

Variables en `.env` (ver `.env.example`):

- `DATABASE_URL=local.db`
- `APP_PASSWORD_HASH` — hash sha256 de tu password de admin
- `SESSION_SECRET` — random ≥32 hex chars

## Deploy (Cloudflare Pages)

Build + upload con wrangler:

```sh
pnpm run build
pnpm exec wrangler pages deploy .svelte-kit/cloudflare \
  --project-name=cambiaton --branch=main
```

Bindings configurados en el proyecto Pages:

- `DB` → D1 `panini-album`
- secret `SESSION_SECRET`
- secret `APP_PASSWORD_HASH`
- `compatibility_flags = ["nodejs_compat"]` (para `AsyncLocalStorage`)

Para regenerar el dump de la sqlite local hacia D1:

```sh
pnpm exec tsx scripts/dump-to-sql.ts
pnpm exec wrangler d1 execute panini-album --remote --file=./drizzle/data.sql
```

## Estructura

```
src/
├── lib/server/
│   ├── auth.ts          # sesiones HMAC + login/registro
│   ├── collection.ts    # CRUD de colecciones por usuario
│   ├── matcher.ts       # propone intercambios óptimos
│   ├── groups.ts        # agregados por equipo/confederación
│   └── db/
│       ├── index.ts     # cliente D1 vía Proxy + ALS
│       └── schema.ts    # tablas drizzle (sqlite-core)
└── routes/
    ├── +page.*          # catálogo principal
    ├── cambiaton/       # matcher de intercambios
    ├── compartir/       # link público para que otros importen su lista
    ├── intercambio/     # detalle de un intercambio
    ├── importar/        # cargar lista propia desde xlsx
    ├── reportes/        # resumen por equipo
    ├── mi-qr/           # QR + link de tu colección
    └── login, registro, logout
```
