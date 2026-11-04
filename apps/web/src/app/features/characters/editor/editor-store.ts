import { computed, inject, Service, signal } from '@angular/core';
import {
  type BudgetStatus,
  type Character,
  type CharacterSheet,
  checkSheetChange,
  deriveStats,
  emptySheet,
  evaluateSheet,
  findTrait,
  freebieDots,
  type RuleViolation,
  type Ruleset,
  type TraitDefinition,
  traitTotal,
} from '@vampiro/shared';
import { firstValueFrom } from 'rxjs';
import { ApiError, errorMessage } from '../../../core/api-error';
import { CharactersApi } from '../../../core/characters-api';

/**
 * Estado del editor de una ficha. Evalúa en vivo con el motor de @vampiro/shared y
 * solo aplica cambios que no introducen errores nuevos (checkSheetChange).
 * Se provee en el componente del editor: una instancia por ficha abierta.
 */
@Service({ autoProvided: false })
export class EditorStore {
  private readonly api = inject(CharactersApi);

  readonly character = signal<Character | undefined>(undefined);
  readonly ruleset = signal<Ruleset | undefined>(undefined);
  readonly sheet = signal<CharacterSheet>(emptySheet());
  readonly meta = signal({ name: '', concept: '' });

  private readonly sheetDirty = signal(false);
  /** Hay cambios sin guardar (en la ficha, el nombre o el concepto). */
  readonly dirty = computed(() => {
    const c = this.character();
    const meta = this.meta();
    return this.sheetDirty() || (!!c && (meta.name !== c.name || meta.concept !== c.concept));
  });
  readonly saving = signal(false);
  readonly saveError = signal<string | undefined>(undefined);
  readonly conflict = signal(false);
  private readonly serverViolations = signal<RuleViolation[]>([]);

  readonly evaluation = computed(() => {
    const ruleset = this.ruleset();
    return ruleset ? evaluateSheet(this.sheet(), ruleset) : undefined;
  });

  readonly derived = computed(() => {
    const ruleset = this.ruleset();
    return ruleset ? deriveStats(this.sheet(), ruleset) : undefined;
  });

  /** Errores locales y los que devolvió el servidor en el último guardado. */
  readonly errors = computed(() => {
    const local = this.evaluation()?.violations.filter((v) => v.severity === 'error') ?? [];
    const seen = new Set(local.map((v) => `${v.code}|${v.path}`));
    return [...local, ...this.serverViolations().filter((v) => !seen.has(`${v.code}|${v.path}`))];
  });

  readonly warnings = computed(
    () => this.evaluation()?.violations.filter((v) => v.severity === 'warning') ?? [],
  );

  init(character: Character, ruleset: Ruleset): void {
    this.character.set(character);
    this.ruleset.set(ruleset);
    this.sheet.set(character.sheet);
    this.meta.set({ name: character.name, concept: character.concept });
    this.sheetDirty.set(false);
    this.serverViolations.set([]);
    this.saveError.set(undefined);
    this.conflict.set(false);
  }

  trait(key: string): TraitDefinition | undefined {
    const ruleset = this.ruleset();
    return ruleset ? findTrait(ruleset, key) : undefined;
  }

  total(key: string): number {
    const ruleset = this.ruleset();
    return ruleset ? traitTotal(this.sheet(), ruleset, key) : 0;
  }

  freebieDots(key: string): number {
    return freebieDots(this.sheet(), key);
  }

  /** Mínimo que no se puede quitar desde la creación: base + lo comprado con gratuitos. */
  minimum(key: string): number {
    return (this.trait(key)?.base ?? 0) + this.freebieDots(key);
  }

  budget(path: string): BudgetStatus | undefined {
    return this.evaluation()?.budgets.find((b) => b.path === path);
  }

  violationsFor(path: string): RuleViolation[] {
    return this.errors().filter((v) => v.path === path);
  }

  /** Motivo por el que el rasgo no puede tener `total` puntos, o undefined si se puede. */
  blockedReason(key: string, total: number): string | undefined {
    const def = this.trait(key);
    if (!def) return 'Ese rasgo no existe en esta edición.';
    if (total < this.minimum(key)) return `${def.name} no puede bajar de ${this.minimum(key)}.`;
    if (def.max !== undefined && total > def.max) {
      return `${def.name} no puede superar ${def.max}.`;
    }
    return this.reasonFor(this.withTotal(key, total));
  }

  setTotal(key: string, total: number): void {
    const clamped = Math.max(this.minimum(key), total);
    if (clamped === this.total(key) || this.blockedReason(key, clamped)) return;
    this.apply(this.withTotal(key, clamped));
  }

  /** Asigna una prioridad a un grupo; si otro grupo la tenía, intercambian. */
  setPriority(category: 'attribute' | 'ability', group: string, priority: number): void {
    const sheet = this.sheet();
    const current = { ...(sheet.priorities[category] ?? {}) };
    const previous = current[group];
    for (const [other, p] of Object.entries(current)) {
      if (other !== group && p === priority) {
        if (previous === undefined) delete current[other];
        else current[other] = previous;
      }
    }
    current[group] = priority;
    this.apply({ ...sheet, priorities: { ...sheet.priorities, [category]: current } });
  }

  /** Cambia el clan y quita los puntos de creación en disciplinas que dejan de ser de clan. */
  setClan(clanKey: string): void {
    const ruleset = this.ruleset();
    if (!ruleset) return;
    const clan = ruleset.clans.find((c) => c.key === clanKey);
    const traits = { ...this.sheet().traits };
    for (const key of Object.keys(traits)) {
      if (this.trait(key)?.category === 'discipline' && !clan?.disciplines.includes(key)) {
        delete traits[key];
      }
    }
    this.apply({ ...this.sheet(), clan: clanKey, traits });
  }

  freebieReason(key: string, delta: 1 | -1): string | undefined {
    if (delta < 0 && this.freebieDots(key) === 0) return 'No has comprado puntos aquí.';
    const def = this.trait(key);
    if (def?.max !== undefined && delta > 0 && this.total(key) >= def.max) {
      return `${def.name} ya está al máximo (${def.max}).`;
    }
    return this.reasonFor(this.withFreebie(key, delta));
  }

  buyFreebie(key: string, delta: 1 | -1): void {
    if (this.freebieReason(key, delta)) return;
    this.apply(this.withFreebie(key, delta));
  }

  /** Distribución elegida para un presupuesto por patrón (V5). */
  setPatternChoice(key: string, optionId: string): void {
    const sheet = this.sheet();
    this.apply({ ...sheet, patternChoices: { ...(sheet.patternChoices ?? {}), [key]: optionId } });
  }

  specialtyReason(skill: string, name: string): string | undefined {
    if (name.trim().length === 0) return 'Escribe el nombre de la especialidad.';
    if (name.trim().length > 40) return 'Como mucho 40 caracteres.';
    return this.reasonFor(
      this.withSpecialties([...(this.sheet().specialties ?? []), { skill, name: name.trim() }]),
    );
  }

  addSpecialty(skill: string, name: string): void {
    if (this.specialtyReason(skill, name)) return;
    this.apply(
      this.withSpecialties([...(this.sheet().specialties ?? []), { skill, name: name.trim() }]),
    );
  }

  removeSpecialty(index: number): void {
    this.apply(
      this.withSpecialties((this.sheet().specialties ?? []).filter((_, i) => i !== index)),
    );
  }

  hasMeritFlaw(key: string): boolean {
    return this.sheet().meritsFlaws?.includes(key) ?? false;
  }

  /** Motivo por el que no se puede añadir el mérito o defecto (quitarlo siempre se puede). */
  meritFlawReason(key: string): string | undefined {
    if (this.hasMeritFlaw(key)) return undefined;
    return this.reasonFor(this.withMeritFlaw(key));
  }

  toggleMeritFlaw(key: string): void {
    if (this.meritFlawReason(key)) return;
    this.apply(this.withMeritFlaw(key));
  }

  async save(): Promise<boolean> {
    const character = this.character();
    if (!character) return false;
    this.saving.set(true);
    this.saveError.set(undefined);
    try {
      const saved = await firstValueFrom(
        this.api.update(character.id, {
          ...this.meta(),
          sheet: this.sheet(),
          updatedAt: character.updatedAt,
        }),
      );
      this.character.set(saved);
      this.meta.set({ name: saved.name, concept: saved.concept });
      this.sheetDirty.set(false);
      this.serverViolations.set([]);
      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  /** Guarda si hace falta y pide a la API que marque la ficha como completa. */
  async complete(): Promise<boolean> {
    if (this.dirty() && !(await this.save())) return false;
    const character = this.character();
    if (!character) return false;
    this.saving.set(true);
    try {
      this.character.set(await firstValueFrom(this.api.complete(character.id)));
      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  private handleError(error: unknown): void {
    this.saveError.set(errorMessage(error));
    if (error instanceof ApiError) {
      if (error.status === 422 && error.violations) this.serverViolations.set(error.violations);
      if (error.status === 409) this.conflict.set(true);
    }
  }

  private reasonFor(next: CharacterSheet): string | undefined {
    const ruleset = this.ruleset();
    if (!ruleset) return 'Las reglas todavía se están cargando.';
    return checkSheetChange(this.sheet(), next, ruleset)[0]?.message;
  }

  private withTotal(key: string, total: number): CharacterSheet {
    const sheet = this.sheet();
    const dots = total - this.minimum(key);
    const traits = { ...sheet.traits };
    if (dots > 0) traits[key] = dots;
    else delete traits[key];
    return { ...sheet, traits };
  }

  private withSpecialties(specialties: { skill: string; name: string }[]): CharacterSheet {
    return { ...this.sheet(), specialties };
  }

  private withMeritFlaw(key: string): CharacterSheet {
    const sheet = this.sheet();
    const current = sheet.meritsFlaws ?? [];
    const meritsFlaws = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key];
    return { ...sheet, meritsFlaws };
  }

  private withFreebie(key: string, delta: number): CharacterSheet {
    const sheet = this.sheet();
    const dots = this.freebieDots(key) + delta;
    const others = sheet.freebies.filter((f) => f.traitKey !== key);
    return {
      ...sheet,
      freebies: dots > 0 ? [...others, { traitKey: key, dots }] : others,
    };
  }

  private apply(next: CharacterSheet): void {
    this.sheet.set(next);
    this.sheetDirty.set(true);
    this.serverViolations.set([]);
  }
}
