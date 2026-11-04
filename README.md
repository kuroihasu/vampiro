# Vampiro: la Mascarada

Web para jugar a Vampiro: la Mascarada: guías y wiki, fichas de personaje clasificadas
por edición con cálculo de puntos, salas de partida con invitación y calculadora de dados.

## Estructura

Monorepo con **pnpm workspaces**:

```
apps/
  web/          Angular: SPA (wiki, personajes, salas, dados)
  api/          NestJS + Prisma (PostgreSQL): API REST bajo /api/v1
libs/
  shared/       @vampiro/shared: tipos, rulesets por edición y motor de reglas
docker-compose.yml   PostgreSQL de desarrollo (bases vampiro y vampiro_test)
```

La idea central: las reglas de cada edición son **datos** (`libs/shared/src/rulesets`) que
interpreta un **motor puro** (`libs/shared/src/engine`). El front lo usa para calcular los
puntos en vivo y bloquear lo que no se puede, explicando el motivo; la API lo vuelve a
ejecutar y tiene la última palabra.

### apps/api

| Carpeta              | Contenido                                                                               |
| -------------------- | --------------------------------------------------------------------------------------- |
| `prisma/`            | Esquema, migraciones y seed de la wiki                                                  |
| `src/config`         | Variables de entorno validadas al arrancar (`@nestjs/config`)                           |
| `src/common`         | Filtro global de errores, `ApiException`, decoradores `@Public` y `@CurrentUser`        |
| `src/modules/auth`   | `POST /auth/register`, `/login`, `/refresh`, `/logout`                                  |
| `src/modules/users`  | `GET` y `PATCH /users/me`                                                               |
| `src/modules/wiki`   | `GET /wiki/categories`, `/wiki/articles?categoria=&edicion=&q=`, `/wiki/articles/:slug` |
| `src/modules/rules`  | `GET /editions`, `GET /rulesets/:edicion`, `GET /traits/:ed/:k`                         |
| `src/modules/health` | `GET /health`                                                                           |

Todas las rutas exigen sesión salvo las marcadas con `@Public()` (auth, wiki, rules y health).

**Sesión:** access token JWT de 15 minutos en memoria del navegador (cabecera `Authorization`)
y refresh token opaco en una cookie `httpOnly` y `SameSite=Strict` limitada a `/api/v1/auth`.
El refresh se guarda como hash, se rota en cada uso y, si alguien reutiliza uno ya rotado,
se revocan todas las sesiones de ese usuario. Login y registro tienen límite de intentos.

Próximos módulos: `characters`, `rooms`, `dice`, `realtime`.

### apps/web

| Carpeta            | Contenido                                                                       |
| ------------------ | ------------------------------------------------------------------------------- |
| `src/app/core`     | Sesión (`SessionStore`), interceptores de auth y errores, guard, `RulesService` |
| `src/app/shared`   | Markdown seguro y directiva `traitTooltip`                                      |
| `src/app/features` | Áreas con lazy loading: `home`, `wiki`, `auth`, `characters`, `rooms`           |

En desarrollo, `/api` se redirige a `http://localhost:3000` (`proxy.conf.json`).

En los artículos de la wiki, `[Celeridad](rasgo:celeridad)` se muestra como una mención con
tooltip (resumen y niveles del rasgo, sacados del ruleset).

## Requisitos

- Node.js 22 o superior
- pnpm 10 (`corepack enable` lo activa con la versión de `packageManager`)
- Docker (para PostgreSQL)

## Primera puesta en marcha

```bash
pnpm install                                   # instala todo y genera el cliente de Prisma
cp apps/api/.env.example apps/api/.env         # y cambia JWT_ACCESS_SECRET
cp apps/api/.env.test.example apps/api/.env.test
pnpm db:up                                     # levanta PostgreSQL (espera a que esté listo)
pnpm db:migrate                                # aplica las migraciones a la base de desarrollo
pnpm db:seed                                   # carga los artículos de ejemplo de la wiki
pnpm build:shared                              # genera libs/shared/dist
```

Para generar un secreto:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Desarrollo

Cada uno en su terminal:

```bash
pnpm dev:api          # API en http://localhost:3000/api/v1
pnpm dev:web          # Web en http://localhost:4200
pnpm dev:shared       # opcional: recompila @vampiro/shared al guardar
```

## Comandos

```bash
pnpm build            # compila shared, api y web (en ese orden)
pnpm test             # tests unitarios de los tres paquetes
pnpm test:e2e         # e2e de la API contra la base vampiro_test (necesita pnpm db:up)
pnpm db:up            # arranca PostgreSQL
pnpm db:down          # lo para (los datos se conservan en un volumen de Docker)
pnpm db:migrate       # crea/aplica migraciones (prisma migrate dev)
pnpm db:seed          # vuelve a cargar los artículos de ejemplo (idempotente)
```

Los e2e aplican las migraciones a `vampiro_test` antes de empezar y vacían las tablas entre
pruebas; nunca tocan la base de desarrollo.

## Estado

Fase 1: base, cuentas de usuario y wiki de solo lectura con tooltips. Solo el ruleset de V20
está cargado y es parcial; sus números deben revisarse contra el manual. Los textos de rasgos
y de la wiki son resúmenes propios.
