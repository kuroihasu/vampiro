# Vampiro: la Mascarada

Web para jugar a Vampiro: la Mascarada: guías y wiki, fichas de personaje clasificadas
por edición con cálculo de puntos, salas de partida con invitación y calculadora de dados.

## Estructura

Monorepo con **pnpm workspaces**:

```
apps/
  web/          Angular: SPA (wiki, personajes, salas, dados)
  api/          NestJS: API REST bajo /api/v1 (+ WebSocket para salas, más adelante)
libs/
  shared/       @vampiro/shared: tipos, rulesets por edición y motor de reglas
```

La idea central: las reglas de cada edición son **datos** (`libs/shared/src/rulesets`) que
interpreta un **motor puro** (`libs/shared/src/engine`). El front lo usa para calcular los
puntos en vivo y bloquear lo que no se puede, explicando el motivo; la API lo vuelve a
ejecutar y tiene la última palabra.

### apps/api

| Carpeta              | Contenido                                                       |
| -------------------- | --------------------------------------------------------------- |
| `src/common`         | Filtro global de excepciones y `ApiException` (formato común)   |
| `src/modules/rules`  | `GET /editions`, `GET /rulesets/:edicion`, `GET /traits/:ed/:k` |
| `src/modules/health` | `GET /health`                                                   |

Próximos módulos: `auth`, `users`, `wiki`, `characters`, `rooms`, `dice`, `realtime`.

### apps/web

| Carpeta            | Contenido                                                     |
| ------------------ | ------------------------------------------------------------- |
| `src/app/core`     | Servicios transversales (`RulesService` con caché)            |
| `src/app/features` | Áreas con lazy loading: `home`, `wiki`, `characters`, `rooms` |

En desarrollo, `/api` se redirige a `http://localhost:3000` (`proxy.conf.json`).

## Requisitos

- Node.js 22 o superior
- pnpm 10 (`corepack enable` lo activa con la versión de `packageManager`)

## Comandos

```bash
pnpm install          # instala todo el workspace
pnpm build            # compila shared, api y web (en ese orden)
pnpm test             # tests de los tres paquetes

# Desarrollo (cada uno en su terminal)
pnpm dev:shared       # recompila @vampiro/shared al guardar
pnpm dev:api          # API en http://localhost:3000/api/v1
pnpm dev:web          # Web en http://localhost:4200
```

Antes del primer `dev:api` o `dev:web`, ejecuta `pnpm build:shared` para generar `libs/shared/dist`.

## Estado

Fase 1 (base) en curso. Solo el ruleset de V20 está cargado y es parcial; sus números
deben revisarse contra el manual. Los textos de rasgos son resúmenes propios.
