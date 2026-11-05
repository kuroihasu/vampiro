import type { CharacterSheet } from '../types/character.js';
import type { RoomConfig } from '../types/room-config.js';
import type { Ruleset } from '../types/ruleset.js';
import type { RuleViolation } from '../errors/violation.js';
import { deriveStats } from './derived.js';
import { findTrait, freebieDots } from './traits.js';

export interface BudgetStatus {
  /** p. ej. "attribute.physical", "discipline", "freebies". */
  path: string;
  available: number;
  spent: number;
}

export interface SheetEvaluation {
  budgets: BudgetStatus[];
  violations: RuleViolation[];
  /** true si no hay violaciones con severidad `error`. */
  valid: boolean;
}

export interface EvaluateOptions {
  /** `complete` convierte los puntos sin repartir en error. Por defecto `draft`. */
  mode?: 'draft' | 'complete';
  roomConfig?: RoomConfig;
}

/**
 * Evalúa una ficha contra el ruleset de su edición (y la config de sala, si la hay).
 * Es una función pura: la usa el front para calcular puntos en vivo y el back como autoridad.
 */
export function evaluateSheet(
  sheet: CharacterSheet,
  ruleset: Ruleset,
  options: EvaluateOptions = {},
): SheetEvaluation {
  const mode = options.mode ?? 'draft';
  const budgets: BudgetStatus[] = [];
  const violations: RuleViolation[] = [];
  const unspentSeverity = mode === 'complete' ? 'error' : 'warning';

  // Rasgos desconocidos
  const keys = new Set([...Object.keys(sheet.traits), ...sheet.freebies.map((f) => f.traitKey)]);
  for (const key of keys) {
    if (!findTrait(ruleset, key)) {
      violations.push({
        code: 'RASGO_DESCONOCIDO',
        severity: 'error',
        path: key,
        message: `El rasgo "${key}" no existe en ${ruleset.edition.toUpperCase()}.`,
      });
    }
  }

  // Puntos negativos o compras vacías: abaratarían otros presupuestos
  for (const [key, dots] of Object.entries(sheet.traits)) {
    if (dots < 0) {
      violations.push({
        code: 'REQUISITO_NO_CUMPLIDO',
        severity: 'error',
        path: key,
        message: `${findTrait(ruleset, key)?.name ?? key} no puede tener puntos negativos.`,
      });
    }
  }
  for (const purchase of sheet.freebies) {
    if (purchase.dots <= 0) {
      violations.push({
        code: 'REQUISITO_NO_CUMPLIDO',
        severity: 'error',
        path: purchase.traitKey,
        message: 'Cada compra con puntos gratuitos debe sumar al menos un punto.',
      });
    }
  }

  // Rasgos sin presupuesto de creación (p. ej. Humanidad): solo con puntos gratuitos
  const budgeted = new Set<string>([
    ...ruleset.creation.priorities.map((b) => b.category),
    ...ruleset.creation.fixed.map((b) => b.category),
  ]);
  for (const [key, dots] of Object.entries(sheet.traits)) {
    const def = findTrait(ruleset, key);
    if (def && dots > 0 && !budgeted.has(def.category)) {
      violations.push({
        code: 'REQUISITO_NO_CUMPLIDO',
        severity: 'error',
        path: key,
        message: `${def.name} no se reparte al crear; súbelo con puntos gratuitos.`,
      });
    }
  }

  // Presupuestos por prioridad (atributos y habilidades)
  for (const budget of ruleset.creation.priorities) {
    const choice = sheet.priorities[budget.category] ?? {};
    const assigned = budget.groups.map((g) => choice[g]);
    const complete = assigned.every((p) => p !== undefined);
    const valid =
      assigned.every((p) => p === undefined || (p >= 0 && p < budget.points.length)) &&
      new Set(assigned.filter((p) => p !== undefined)).size ===
        assigned.filter((p) => p !== undefined).length;

    if (!valid) {
      violations.push({
        code: 'PRIORIDAD_INVALIDA',
        severity: 'error',
        path: budget.category,
        message: 'Cada grupo debe tener una prioridad distinta (primaria, secundaria, terciaria).',
      });
    } else if (!complete) {
      violations.push({
        code: 'PRIORIDAD_INVALIDA',
        severity: unspentSeverity,
        path: budget.category,
        message: 'Falta elegir la prioridad de algún grupo.',
      });
    }

    for (const group of budget.groups) {
      const traits = ruleset.catalog.filter(
        (t) => t.category === budget.category && t.group === group,
      );
      const spent = traits.reduce((sum, t) => sum + (sheet.traits[t.key] ?? 0), 0);
      const priority = choice[group];
      const available = valid && priority !== undefined ? (budget.points[priority] ?? 0) : 0;
      const path = `${budget.category}.${group}`;
      const label = budget.groupLabels[group] ?? group;
      budgets.push({ path, available, spent });

      if (valid && priority !== undefined) {
        if (spent > available) {
          violations.push({
            code: 'PRESUPUESTO_EXCEDIDO',
            severity: 'error',
            path,
            message: `Has repartido ${spent} de ${available} puntos en ${label}.`,
          });
        } else if (spent < available) {
          violations.push({
            code: 'PUNTOS_SIN_REPARTIR',
            severity: unspentSeverity,
            path,
            message: `Te quedan ${available - spent} puntos por repartir en ${label}.`,
          });
        }
      }

      if (budget.maxPerTraitAtCreation !== undefined) {
        for (const t of traits) {
          const value = (t.base ?? 0) + (sheet.traits[t.key] ?? 0);
          if (value > budget.maxPerTraitAtCreation) {
            violations.push({
              code: 'MAX_CREACION_SUPERADO',
              severity: 'error',
              path: t.key,
              message: `En ${ruleset.edition.toUpperCase()} ${t.name} no puede superar ${budget.maxPerTraitAtCreation} puntos antes de los puntos gratuitos.`,
            });
          }
        }
      }
    }
  }

  // Presupuestos fijos (disciplinas, trasfondos, virtudes)
  const clan = ruleset.clans.find((c) => c.key === sheet.clan);
  for (const budget of ruleset.creation.fixed) {
    const traits = ruleset.catalog.filter((t) => t.category === budget.category);
    const spent = traits.reduce((sum, t) => sum + (sheet.traits[t.key] ?? 0), 0);
    budgets.push({ path: budget.category, available: budget.points, spent });

    if (spent > budget.points) {
      violations.push({
        code: 'PRESUPUESTO_EXCEDIDO',
        severity: 'error',
        path: budget.category,
        message: `Has repartido ${spent} de ${budget.points} puntos en ${budget.label}.`,
      });
    } else if (spent < budget.points) {
      violations.push({
        code: 'PUNTOS_SIN_REPARTIR',
        severity: unspentSeverity,
        path: budget.category,
        message: `Te quedan ${budget.points - spent} puntos por repartir en ${budget.label}.`,
      });
    }

    if (budget.clanOnly) {
      for (const t of traits) {
        if ((sheet.traits[t.key] ?? 0) > 0 && !clan?.disciplines.includes(t.key)) {
          violations.push({
            code: 'DISCIPLINA_FUERA_DE_CLAN',
            severity: 'error',
            path: t.key,
            message: clan
              ? `${t.name} no es disciplina de clan ${clan.name}; al crear solo puedes usar disciplinas de clan.`
              : `Elige un clan antes de repartir puntos en ${t.name}.`,
          });
        }
      }
    }
  }

  // Puntos gratuitos
  if (ruleset.freebies) {
    const total = ruleset.freebies.total + (options.roomConfig?.extraFreebies ?? 0);
    let spent = 0;
    for (const purchase of sheet.freebies) {
      const def = findTrait(ruleset, purchase.traitKey);
      if (!def) continue;
      const cost = ruleset.freebies.traitCosts?.[def.key] ?? ruleset.freebies.costs[def.category];
      if (cost === undefined) {
        violations.push({
          code: 'REQUISITO_NO_CUMPLIDO',
          severity: 'error',
          path: def.key,
          message: `${def.name} no se puede comprar con puntos gratuitos.`,
        });
        continue;
      }
      spent += cost * purchase.dots;
    }
    budgets.push({ path: 'freebies', available: total, spent });
    if (spent > total) {
      violations.push({
        code: 'PRESUPUESTO_EXCEDIDO',
        severity: 'error',
        path: 'freebies',
        message: `Has gastado ${spent} de ${total} puntos gratuitos.`,
      });
    }
  }

  // Máximo absoluto por rasgo
  for (const key of keys) {
    const def = findTrait(ruleset, key);
    if (!def?.max) continue;
    const value = (def.base ?? 0) + (sheet.traits[key] ?? 0) + freebieDots(sheet, key);
    if (value > def.max) {
      violations.push({
        code: 'MAX_GENERACION_SUPERADO',
        severity: 'error',
        path: key,
        message: `${def.name} no puede superar ${def.max} puntos.`,
      });
    }
  }

  // Rasgos derivados (Humanidad, Voluntad)
  const derived = deriveStats(sheet, ruleset);
  if (derived && ruleset.derived) {
    const checks = [
      { rule: ruleset.derived.humanity, value: derived.humanity },
      { rule: ruleset.derived.willpower, value: derived.willpower },
    ];
    for (const { rule, value } of checks) {
      if (value > rule.max) {
        const name = findTrait(ruleset, rule.traitKey)?.name ?? rule.traitKey;
        violations.push({
          code: 'MAX_GENERACION_SUPERADO',
          severity: 'error',
          path: rule.traitKey,
          message: `${name} no puede superar ${rule.max} (ahora suma ${value}).`,
        });
      }
    }
  }

  // Configuración de la sala
  if (options.roomConfig) {
    violations.push(...checkRoomConfig(sheet, ruleset, options.roomConfig));
  }

  return { budgets, violations, valid: !violations.some((v) => v.severity === 'error') };
}

function checkRoomConfig(
  sheet: CharacterSheet,
  ruleset: Ruleset,
  config: RoomConfig,
  isNpc = false,
): RuleViolation[] {
  const violations: RuleViolation[] = [];

  if (config.allowedClans !== 'all' && sheet.clan && !config.allowedClans.includes(sheet.clan)) {
    violations.push({
      code: 'CLAN_NO_PERMITIDO',
      severity: 'error',
      path: 'clan',
      message: 'El master no permite este clan en la sala.',
    });
  }

  for (const rule of config.disciplineRules) {
    const allowed = isNpc ? rule.npc : rule.players;
    const dots = (sheet.traits[rule.discipline] ?? 0) + freebieDots(sheet, rule.discipline);
    if (!allowed && dots > 0) {
      const name = findTrait(ruleset, rule.discipline)?.name ?? rule.discipline;
      violations.push({
        code: 'DISCIPLINA_NO_PERMITIDA',
        severity: 'error',
        path: rule.discipline,
        message: `El master no permite ${name} para ${isNpc ? 'NPC' : 'jugadores'} en esta sala.`,
      });
    }
  }

  const generation = deriveStats(sheet, ruleset)?.generation;
  if (generation !== undefined) {
    const { minGeneration, maxGeneration } = config;
    if (
      (minGeneration !== undefined && generation < minGeneration) ||
      (maxGeneration !== undefined && generation > maxGeneration)
    ) {
      violations.push({
        code: 'REQUISITO_NO_CUMPLIDO',
        severity: 'error',
        path: 'generation',
        message: `La sala solo admite generaciones entre ${minGeneration ?? '-'} y ${maxGeneration ?? '-'}.`,
      });
    }
  }

  return violations;
}

/**
 * ¿Se puede pasar de `sheet` a `next`? Devuelve solo los errores nuevos que provocaría
 * el cambio. Lista vacía = el editor puede aplicarlo.
 */
export function checkSheetChange(
  sheet: CharacterSheet,
  next: CharacterSheet,
  ruleset: Ruleset,
  options: EvaluateOptions = {},
): RuleViolation[] {
  const errors = (s: CharacterSheet) =>
    evaluateSheet(s, ruleset, options).violations.filter((v) => v.severity === 'error');
  const seen = new Set(errors(sheet).map((v) => `${v.code}|${v.path}`));
  return errors(next).filter((v) => !seen.has(`${v.code}|${v.path}`));
}

/**
 * ¿Se puede poner este rasgo a `newDots` puntos de creación? Atajo de checkSheetChange.
 */
export function checkTraitChange(
  sheet: CharacterSheet,
  ruleset: Ruleset,
  traitKey: string,
  newDots: number,
  options: EvaluateOptions = {},
): RuleViolation[] {
  const next: CharacterSheet = { ...sheet, traits: { ...sheet.traits, [traitKey]: newDots } };
  return checkSheetChange(sheet, next, ruleset, options);
}
