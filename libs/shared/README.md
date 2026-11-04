# @vampiro/shared

Librería TypeScript que comparten `apps/web` y `apps/api`:

- `editions.ts`: ediciones soportadas (V20, V5, Edad Oscura, Revisada).
- `types/`: modelos comunes (rasgos, ruleset, ficha, configuración de sala, dados).
- `errors/`: códigos de violación y de error de la API, y el formato de error común.
- `rulesets/`: reglas de cada edición como datos. Por ahora solo V20 (parcial).
- `engine/`: funciones puras `evaluateSheet`, `checkTraitChange` y `calculateDicePool`.

El front usa el motor para calcular puntos en vivo y bloquear lo que no se puede;
el back lo vuelve a ejecutar y tiene la última palabra.

```bash
pnpm --filter @vampiro/shared build   # compila a dist/
pnpm --filter @vampiro/shared dev     # tsc --watch
pnpm --filter @vampiro/shared test
```
