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

| Carpeta                  | Contenido                                                                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `prisma/`                | Esquema, migraciones y seed de la wiki                                                                                                                                                                                         |
| `src/config`             | Variables de entorno validadas al arrancar (`@nestjs/config`)                                                                                                                                                                  |
| `src/common`             | Filtro global de errores, `ApiException`, decoradores `@Public` y `@CurrentUser`                                                                                                                                               |
| `src/modules/auth`       | `POST /auth/register`, `/login`, `/refresh`, `/logout`                                                                                                                                                                         |
| `src/modules/users`      | `GET` y `PATCH /users/me`                                                                                                                                                                                                      |
| `src/modules/wiki`       | `GET /wiki/categories`, `/wiki/articles?categoria=&edicion=&q=`, `/wiki/articles/:slug`                                                                                                                                        |
| `src/modules/characters` | `GET /characters?edicion=`, `POST /characters`, `GET/PUT/DELETE /characters/:id`, `POST /characters/:id/evaluate` y `/complete`                                                                                                |
| `src/modules/rooms`      | `POST/GET /rooms`, `GET /rooms/:id`, `PATCH /rooms/:id/config`, `POST /rooms/:id/invite-code`, `GET /rooms/invite/:codigo`, `POST /rooms/join`, `DELETE /rooms/:id/members/:userId`, `POST/PATCH/DELETE /rooms/:id/characters` |
| `src/modules/dice`       | `POST /rooms/:id/dice-pool`, `POST /rooms/:id/rolls`, `GET /rooms/:id/rolls?cursor=`                                                                                                                                           |
| `src/modules/realtime`   | WebSocket Socket.IO en el namespace `/rooms` (eventos de la sala)                                                                                                                                                              |
| `src/modules/rules`      | `GET /editions`, `GET /rulesets/:edicion`, `GET /traits/:ed/:k`                                                                                                                                                                |
| `src/modules/health`     | `GET /health`                                                                                                                                                                                                                  |

Todas las rutas exigen sesión salvo las marcadas con `@Public()` (auth, wiki, rules y health).

**Sesión:** access token JWT de 15 minutos en memoria del navegador (cabecera `Authorization`)
y refresh token opaco en una cookie `httpOnly` y `SameSite=Strict` limitada a `/api/v1/auth`.
El refresh se guarda como hash, se rota en cada uso y, si alguien reutiliza uno ya rotado,
se revocan todas las sesiones de ese usuario. Login y registro tienen límite de intentos.

**Wiki:** la lectura es pública. Crear, editar y borrar artículos exige el rol `admin`
(`RolesGuard`). Para dar ese rol a tu cuenta, regístrate en la web y luego ejecuta
`pnpm db:admin tu@email.com`.

**Fichas:** el `PUT` valida la forma de la ficha (400) y las reglas con `evaluateSheet` de
`@vampiro/shared` (422 `RULE_VIOLATION` con la lista de violaciones). El cuerpo lleva el
`updatedAt` que se editó: si otra pestaña guardó antes, responde 409 `CONFLICTO_VERSION`.
La ficha de otro usuario responde 404, igual que una inexistente.

**Salas:** quien crea la sala es su master. Los demás entran con el código o el enlace
`/salas/unirse/:codigo` (la vista previa es pública; el código puede caducar). A quien no es
miembro se le responde 404, y lo reservado al master responde 403. Cada ficha vinculada se
evalúa en modo completo con la configuración de la sala (con las reglas de NPC si lo es); se
recalcula al vincularla, al guardar la ficha y al cambiar la configuración.

**Dados:** las tiradas se hacen en el servidor (`crypto.randomInt`) y se interpretan con
`resolveRoll` de `@vampiro/shared`. Son inmutables. La reserva sale de la ficha (rasgos o
acción sugerida) o es una tirada libre. Hay límite de 10 tiradas cada 10 segundos por persona.
`PATCH /rooms/:id/characters/:linkId/state` guarda salud, voluntad y sangre en partida.

**Tiempo real:** el cliente se conecta a `/rooms` con el mismo access token
(`handshake.auth.token`) y entra con `room.join`. Las escrituras van por REST y el servidor
avisa con `member.joined`, `member.left`, `character.linked`, `character.updated`,
`character.unlinked`, `room.config.updated` y `roll.created`. Con visibilidad "solo master",
una tirada solo llega al master y a quien la hizo. Al reconectar, la web vuelve a entrar en
la sala y recarga el historial para recuperar lo que se perdió.

### apps/web

| Carpeta            | Contenido                                                                       |
| ------------------ | ------------------------------------------------------------------------------- |
| `src/app/core`     | Sesión (`SessionStore`), interceptores de auth y errores, guard, `RulesService` |
| `src/app/shared`   | Markdown seguro y directiva `traitTooltip`                                      |
| `src/app/features` | Áreas con lazy loading: `home`, `wiki`, `auth`, `characters`, `rooms`           |

En desarrollo, `/api` y `/socket.io` se redirigen a `http://localhost:3000` (`proxy.conf.json`).

El editor de fichas (`/personajes/:id`) va por pasos y evalúa la ficha en vivo con el mismo
motor que la API: los puntos que romperían una regla quedan deshabilitados y se explica el
motivo junto al rasgo.

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

Si cambias `libs/shared`, recompílalo (`pnpm build:shared` o `pnpm dev:shared`); la API en
modo watch y `ng serve` recogen el cambio solos. `@vampiro/shared` está excluido del
preempaquetado de Vite (`angular.json`), así que no hace falta borrar `.angular/cache`.

## Comandos

```bash
pnpm build            # compila shared, api y web (en ese orden)
pnpm test             # tests unitarios de los tres paquetes
pnpm test:e2e         # e2e de la API contra la base vampiro_test (necesita pnpm db:up)
pnpm db:up            # arranca PostgreSQL
pnpm db:down          # lo para (los datos se conservan en un volumen de Docker)
pnpm db:migrate       # regenera el cliente de Prisma y aplica/crea migraciones (--name nueva)
pnpm db:seed          # vuelve a cargar los artículos de ejemplo (idempotente)
pnpm db:admin <email> # da el rol de administrador a una cuenta ya registrada
```

Los e2e aplican las migraciones a `vampiro_test` antes de empezar y vacían las tablas entre
pruebas; nunca tocan la base de desarrollo.

## Estado

- Fase 1: base, cuentas de usuario y wiki de solo lectura con tooltips.
- Fase 2: fichas de personaje V20 con editor por pasos y validación en cliente y servidor.
- Fase 3: salas con invitación, configuración del master y validez de las fichas en la sala.
- Fase 4: tiradas en el servidor, historial en vivo por WebSocket y estado en partida.
- Fase 5: méritos y defectos de V20 en la ficha y gestión de la wiki para administradores.

Solo el ruleset de V20 está cargado y es parcial; sus números deben revisarse contra el manual.
Los costes de méritos y defectos de V20 son orientativos y también conviene revisarlos.
Los textos de rasgos y de la wiki son resúmenes propios.
