import type { CharacterSheet } from '../types/character.js';
import type { RoomConfig } from '../types/room-config.js';
import type { PatternBudget, Ruleset } from '../types/ruleset.js';
import type { TraitDefinition } from '../types/trait.js';
import type { RuleViolation } from '../errors/violation.js';
import { deriveStats } from './derived.js';
import { findTrait, freebieDots, traitTotal } from './traits.js';

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
  /** La ficha es un NPC de la sala: se aplican las reglas de disciplinas para NPC. */
  isNpc?: boolean;
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
    ...(ruleset.creation.patterns ?? []).map((b) => b.category),
  ]);
  for (const [key, dots] of Object.entries(sheet.traits)) {
    const def = findTrait(ruleset, key);
    if (def && dots > 0 && !budgeted.has(def.category)) {
      violations.push({
        code: 'REQUISITO_NO_CUMPLIDO',
        severity: 'error',
        path: key,
        message: ruleset.freebies
          ? `${def.name} no se reparte al crear; súbelo con puntos gratuitos.`
          : `${def.name} no se reparte al crear.`,
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

  // Presupuestos por patrón (V5: atributos 4/3/3/3/2/2/2/2/1, habilidades, disciplinas)
  const clan = ruleset.clans.find((c) => c.key === sheet.clan);
  for (const budget of ruleset.creation.patterns ?? []) {
    evaluatePattern(budget, sheet, ruleset, unspentSeverity, budgets, violations);
  }

  // Especialidades (V5)
  if (ruleset.specialties) {
    evaluateSpecialties(sheet, ruleset, unspentSeverity, budgets, violations);
  }

  // Méritos y defectos: según la edición, se pagan con gratuitos (V20) o con un presupuesto fijo (V5)
  const merits = evaluateMeritsFlaws(sheet, ruleset, options, violations);
  if (merits.maxFlawPoints > 0 || merits.flawPoints > 0) {
    budgets.push({ path: 'flaws', available: merits.maxFlawPoints, spent: merits.flawPoints });
  }
  const requiredFlaws = ruleset.meritsFlaws?.requiredFlawPoints;
  if (requiredFlaws !== undefined && merits.flawPoints < requiredFlaws) {
    violations.push({
      code: 'PUNTOS_SIN_REPARTIR',
      severity: unspentSeverity,
      path: 'flaws',
      message: `Elige defectos por ${requiredFlaws} puntos (llevas ${merits.flawPoints}).`,
    });
  }
  const meritsBudget = ruleset.meritsFlaws?.meritsBudget;

  // Presupuestos fijos (disciplinas, trasfondos, virtudes)
  for (const budget of ruleset.creation.fixed) {
    const traits = ruleset.catalog.filter((t) => t.category === budget.category);
    const spent =
      traits.reduce((sum, t) => sum + (sheet.traits[t.key] ?? 0), 0) +
      (meritsBudget === budget.category ? merits.meritCost : 0);
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
    const total =
      ruleset.freebies.total +
      (options.roomConfig?.extraFreebies ?? 0) +
      (meritsBudget ? 0 : Math.min(merits.flawPoints, merits.maxFlawPoints));
    let spent = meritsBudget ? 0 : merits.meritCost;
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
    violations.push(...checkRoomConfig(sheet, ruleset, options.roomConfig, options.isNpc));
  }

  return { budgets, violations, valid: !violations.some((v) => v.severity === 'error') };
}

/** Compara los valores de los rasgos de la categoría con el patrón elegido. */
function evaluatePattern(
  budget: PatternBudget,
  sheet: CharacterSheet,
  ruleset: Ruleset,
  unspentSeverity: 'error' | 'warning',
  budgets: BudgetStatus[],
  violations: RuleViolation[],
): void {
  const traits = ruleset.catalog.filter((t) => t.category === budget.category);
  const assigned = traits
    .map((t) => ({ trait: t, value: traitTotal(sheet, ruleset, t.key) }))
    .filter((a) => a.value > 0);
  const spent = assigned.reduce((n, a) => n + a.value, 0);

  if (budget.clanOnly) {
    const clan = ruleset.clans.find((c) => c.key === sheet.clan);
    for (const { trait } of assigned) {
      if (!clan?.disciplines.includes(trait.key)) {
        violations.push({
          code: 'DISCIPLINA_FUERA_DE_CLAN',
          severity: 'error',
          path: trait.key,
          message: clan
            ? `${trait.name} no es disciplina de clan ${clan.name}; al crear solo puedes usar disciplinas de clan.`
            : `Elige un clan antes de repartir puntos en ${trait.name}.`,
        });
      }
    }
  }

  const option =
    budget.options.length === 1
      ? budget.options[0]
      : budget.options.find((o) => o.id === sheet.patternChoices?.[budget.key]);
  if (!option) {
    budgets.push({ path: budget.key, available: 0, spent });
    violations.push({
      code: 'PRIORIDAD_INVALIDA',
      severity: unspentSeverity,
      path: budget.key,
      message: `Elige una distribución para ${budget.label}.`,
    });
    return;
  }
  budgets.push({
    path: budget.key,
    available: option.values.reduce((n, v) => n + v, 0),
    spent,
  });

  const allowed = countBy(option.values);
  const used = countBy(assigned.map((a) => a.value));
  const excess: string[] = [];
  const missing: string[] = [];
  for (const [value, count] of used) {
    const limit = allowed.get(value) ?? 0;
    if (count > limit) {
      excess.push(
        limit === 0
          ? `ninguno puede tener ${value}`
          : `solo ${limit} ${limit === 1 ? 'puede' : 'pueden'} tener ${value}`,
      );
    }
  }
  for (const [value, count] of allowed) {
    const have = used.get(value) ?? 0;
    if (have < count) missing.push(`${count - have}× ${value}`);
  }

  if (excess.length) {
    violations.push({
      code: 'PRESUPUESTO_EXCEDIDO',
      severity: 'error',
      path: budget.key,
      message: `${budget.label} (${option.label}): ${excess.join('; ')}.`,
    });
  } else if (missing.length) {
    violations.push({
      code: 'PUNTOS_SIN_REPARTIR',
      severity: unspentSeverity,
      path: budget.key,
      message: `${budget.label}: falta asignar ${missing.join(', ')}.`,
    });
  }
}

function countBy(values: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return counts;
}

/** Especialidades: cada una exige puntos en su habilidad; algunas habilidades la exigen. */
function evaluateSpecialties(
  sheet: CharacterSheet,
  ruleset: Ruleset,
  unspentSeverity: 'error' | 'warning',
  budgets: BudgetStatus[],
  violations: RuleViolation[],
): void {
  const rules = ruleset.specialties;
  if (!rules) return;
  const list = sheet.specialties ?? [];
  const required = rules.freeFor.filter((k) => traitTotal(sheet, ruleset, k) > 0);
  const allowed = required.length + rules.extra;
  budgets.push({ path: 'specialties', available: allowed, spent: list.length });

  for (const s of list) {
    const def = findTrait(ruleset, s.skill);
    if (!def || def.category !== 'ability') {
      violations.push({
        code: 'RASGO_DESCONOCIDO',
        severity: 'error',
        path: s.skill,
        message: `"${s.skill}" no es una habilidad de ${ruleset.edition.toUpperCase()}.`,
      });
    } else if (traitTotal(sheet, ruleset, s.skill) === 0) {
      violations.push({
        code: 'REQUISITO_NO_CUMPLIDO',
        severity: 'error',
        path: s.skill,
        message: `Para la especialidad "${s.name}" necesitas al menos un punto en ${def.name}.`,
      });
    }
  }
  if (list.length > allowed) {
    violations.push({
      code: 'PRESUPUESTO_EXCEDIDO',
      severity: 'error',
      path: 'specialties',
      message: `Tienes ${list.length} especialidades; puedes tener ${allowed}.`,
    });
  }
  const missing = required.filter((k) => !list.some((s) => s.skill === k));
  if (missing.length) {
    const names = missing.map((k) => findTrait(ruleset, k)?.name ?? k).join(', ');
    violations.push({
      code: 'PUNTOS_SIN_REPARTIR',
      severity: unspentSeverity,
      path: 'specialties',
      message: `${names} necesita${missing.length > 1 ? 'n' : ''} una especialidad.`,
    });
  }
}

interface MeritsFlawsResult {
  meritCost: number;
  flawPoints: number;
  maxFlawPoints: number;
}

function evaluateMeritsFlaws(
  sheet: CharacterSheet,
  ruleset: Ruleset,
  options: EvaluateOptions,
  violations: RuleViolation[],
): MeritsFlawsResult {
  const roomMax = options.roomConfig?.maxFlawPoints;
  const maxFlawPoints = Math.min(
    ruleset.meritsFlaws?.maxFlawPoints ?? 0,
    roomMax ?? Number.POSITIVE_INFINITY,
  );
  const result: MeritsFlawsResult = { meritCost: 0, flawPoints: 0, maxFlawPoints };
  const seen = new Set<string>();

  for (const key of sheet.meritsFlaws ?? []) {
    const def = findTrait(ruleset, key);
    if (!def || (def.category !== 'merit' && def.category !== 'flaw')) {
      violations.push({
        code: 'RASGO_DESCONOCIDO',
        severity: 'error',
        path: key,
        message: `"${key}" no es un mérito ni un defecto de ${ruleset.edition.toUpperCase()}.`,
      });
      continue;
    }
    if (seen.has(key)) {
      violations.push({
        code: 'REQUISITO_NO_CUMPLIDO',
        severity: 'error',
        path: key,
        message: `${def.name} ya está en la ficha.`,
      });
      continue;
    }
    seen.add(key);

    if (options.roomConfig && !options.roomConfig.allowMeritsFlaws) {
      violations.push({
        code: 'MERITOS_DESACTIVADOS',
        severity: 'error',
        path: key,
        message: `El master no permite méritos ni defectos en esta sala (${def.name}).`,
      });
    }
    const unmet = unmetRequirement(def, sheet, ruleset);
    if (unmet) {
      violations.push({
        code: 'REQUISITO_NO_CUMPLIDO',
        severity: 'error',
        path: key,
        message: unmet,
      });
    }
    if (def.category === 'merit') result.meritCost += def.cost ?? 0;
    else result.flawPoints += def.cost ?? 0;
  }

  if (result.flawPoints > maxFlawPoints) {
    violations.push({
      code: 'PRESUPUESTO_EXCEDIDO',
      severity: 'error',
      path: 'flaws',
      message: `Tienes ${result.flawPoints} puntos de defectos; el máximo es ${maxFlawPoints}.`,
    });
  }
  return result;
}

/** Motivo por el que no se cumple el requisito de un mérito o defecto, o undefined. */
export function unmetRequirement(
  def: TraitDefinition,
  sheet: CharacterSheet,
  ruleset: Ruleset,
): string | undefined {
  const req = def.requires;
  if (!req) return undefined;
  const clanName = (key: string) => ruleset.clans.find((c) => c.key === key)?.name ?? key;
  if (req.clans && !(sheet.clan && req.clans.includes(sheet.clan))) {
    return `${def.name} es solo para ${req.clans.map(clanName).join(' o ')}.`;
  }
  if (req.notClans && sheet.clan && req.notClans.includes(sheet.clan)) {
    return `Un ${clanName(sheet.clan)} no puede tener ${def.name}.`;
  }
  for (const [key, min] of Object.entries(req.minTraits ?? {})) {
    if (traitTotal(sheet, ruleset, key) < min) {
      return `${def.name} exige ${findTrait(ruleset, key)?.name ?? key} ${min} o más.`;
    }
  }
  return undefined;
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
