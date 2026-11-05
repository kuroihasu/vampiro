import { NgTemplateOutlet } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { form, FormField, maxLength, required } from '@angular/forms/signals';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import {
  CHARACTER_CONCEPT_MAX_LENGTH,
  CHARACTER_NAME_MAX_LENGTH,
  type Character,
  EDITIONS,
} from '@vampiro/shared';
import { ApiError, errorMessage } from '../../../core/api-error';
import { RulesService } from '../../../core/rules.service';
import { TraitTooltip } from '../../../shared/trait-tooltip';
import { FieldErrors } from '../../auth/field-errors';
import { EditorStore } from './editor-store';
import { FreebieRow } from './freebie-row';
import { MeritRow } from './merit-row';
import { TraitRow } from './trait-row';

const STEPS = [
  { id: 'concepto', label: 'Concepto' },
  { id: 'clan', label: 'Clan' },
  { id: 'atributos', label: 'Atributos' },
  { id: 'habilidades', label: 'Habilidades' },
  { id: 'ventajas', label: 'Ventajas' },
  { id: 'meritos', label: 'Méritos y defectos' },
  { id: 'gratuitos', label: 'Puntos gratuitos' },
] as const;

const PRIORITY_NAMES = ['Primaria', 'Secundaria', 'Terciaria'];

/** Editor por pasos de una ficha. Todo el cálculo vive en EditorStore. */
@Component({
  selector: 'app-character-editor',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    FormField,
    FieldErrors,
    TraitRow,
    FreebieRow,
    MeritRow,
    TraitTooltip,
  ],
  providers: [EditorStore],
  templateUrl: './character-editor.html',
  styleUrl: './character-editor.scss',
})
export class CharacterEditor {
  readonly id = input.required<string>();

  protected readonly store = inject(EditorStore);
  private readonly rules = inject(RulesService);

  /** Pasos según la edición: sin puntos gratuitos (V5) no hay paso de gratuitos. */
  protected readonly steps = computed(() =>
    STEPS.filter((s) => s.id !== 'gratuitos' || !!this.store.ruleset()?.freebies),
  );
  protected readonly step = signal<(typeof STEPS)[number]['id']>('concepto');
  protected readonly priorityNames = PRIORITY_NAMES;

  protected readonly loaded = httpResource<Character>(
    () => `/api/v1/characters/${encodeURIComponent(this.id())}`,
  );
  private readonly ruleset = rxResource({
    params: () => (this.loaded.hasValue() ? this.loaded.value().edition : undefined),
    stream: ({ params }) => this.rules.ruleset(params),
  });

  protected readonly loadError = computed(() => {
    const error = this.loaded.error() ?? this.ruleset.error();
    if (!error) return undefined;
    return error instanceof ApiError && error.status === 404
      ? 'Esta ficha no existe o no es tuya.'
      : errorMessage(error);
  });

  protected readonly metaForm = form(this.store.meta, (path) => {
    required(path.name, { message: 'El personaje necesita un nombre.' });
    maxLength(path.name, CHARACTER_NAME_MAX_LENGTH, {
      message: `Como mucho ${CHARACTER_NAME_MAX_LENGTH} caracteres.`,
    });
    maxLength(path.concept, CHARACTER_CONCEPT_MAX_LENGTH, {
      message: `Como mucho ${CHARACTER_CONCEPT_MAX_LENGTH} caracteres.`,
    });
  });

  protected readonly editionName = computed(() => {
    const c = this.store.character();
    return EDITIONS.find((e) => e.id === c?.edition)?.name ?? '';
  });

  protected readonly clan = computed(() => {
    const key = this.store.sheet().clan;
    return this.store.ruleset()?.clans.find((c) => c.key === key);
  });

  /**
   * Grupos de una categoría con sus rasgos. Con prioridades (V20) cada grupo lleva su
   * selector y su contador; con patrón (V5) el contador es de toda la categoría.
   */
  protected groupsOf(category: 'attribute' | 'ability') {
    const ruleset = this.store.ruleset();
    if (!ruleset) return [];
    const budget = ruleset.creation.priorities.find((b) => b.category === category);
    const pattern = this.patternOf(category);
    const groups = budget?.groups ?? [
      ...new Set(ruleset.catalog.filter((t) => t.category === category).map((t) => t.group ?? '')),
    ];
    return groups.map((group) => ({
      group,
      label: budget?.groupLabels[group] ?? pattern?.groupLabels?.[group] ?? group,
      path: budget ? `${category}.${group}` : '',
      points: budget?.points ?? [],
      priority: this.store.sheet().priorities[category]?.[group],
      traits: ruleset.catalog
        .filter((t) => t.category === category && t.group === group)
        .map((t) => t.key),
    }));
  }

  protected patternOf(category: 'attribute' | 'ability' | 'discipline') {
    return this.store.ruleset()?.creation.patterns?.find((p) => p.category === category);
  }

  protected readonly attributePattern = computed(() => this.patternOf('attribute'));
  protected readonly skillPattern = computed(() => this.patternOf('ability'));
  protected readonly disciplinePattern = computed(() => this.patternOf('discipline'));

  /** Mensaje (error o aviso) de un presupuesto, para mostrarlo junto a su sección. */
  protected budgetMessage(path: string): string | undefined {
    return (
      this.store.violationsFor(path)[0]?.message ??
      this.store.warnings().find((w) => w.path === path)?.message
    );
  }

  protected setPatternChoice(key: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value) this.store.setPatternChoice(key, value);
  }

  // Especialidades (V5)
  protected readonly specialtySkill = signal('');
  protected readonly specialtyName = signal('');
  protected readonly skillsWithDots = computed(() =>
    this.keysOf('ability').filter((k) => this.store.total(k) > 0),
  );
  protected readonly specialtyBlocked = computed(() =>
    this.specialtySkill()
      ? this.store.specialtyReason(this.specialtySkill(), this.specialtyName())
      : 'Elige una habilidad.',
  );

  protected addSpecialty(event: Event): void {
    event.preventDefault();
    if (this.specialtyBlocked()) return;
    this.store.addSpecialty(this.specialtySkill(), this.specialtyName());
    this.specialtyName.set('');
  }

  protected inputValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected readonly attributeGroups = computed(() => this.groupsOf('attribute'));
  protected readonly abilityGroups = computed(() => this.groupsOf('ability'));

  protected readonly clanDisciplines = computed(() => this.clan()?.disciplines ?? []);
  protected readonly backgrounds = computed(() => this.keysOf('background'));
  protected readonly virtues = computed(() => this.keysOf('virtue'));
  protected readonly derivedKeys = computed(() => this.keysOf('other'));
  protected readonly allAttributes = computed(() => this.keysOf('attribute'));
  protected readonly allAbilities = computed(() => this.keysOf('ability'));
  protected readonly merits = computed(() => this.keysOf('merit'));
  protected readonly flaws = computed(() => this.keysOf('flaw'));

  /** Contadores del resumen, en el orden de los pasos. */
  protected readonly counters = computed(() => {
    const ruleset = this.store.ruleset();
    if (!ruleset) return [];
    const items = [
      ...ruleset.creation.priorities.flatMap((b) =>
        b.groups.map((g) => ({ path: `${b.category}.${g}`, label: b.groupLabels[g] ?? g })),
      ),
      ...(ruleset.creation.patterns ?? []).map((p) => ({ path: p.key, label: p.label })),
      ...ruleset.creation.fixed.map((b) => ({ path: b.category, label: b.label })),
      ...(ruleset.specialties ? [{ path: 'specialties', label: 'Especialidades' }] : []),
      ...(ruleset.meritsFlaws ? [{ path: 'flaws', label: 'Puntos de defectos' }] : []),
      ...(ruleset.freebies ? [{ path: 'freebies', label: 'Puntos gratuitos' }] : []),
    ];
    return items.map((i) => ({ ...i, budget: this.store.budget(i.path) }));
  });

  protected readonly notice = signal<string | undefined>(undefined);

  constructor() {
    effect(() => {
      if (!this.loaded.hasValue() || !this.ruleset.hasValue()) return;
      const character = this.loaded.value();
      const ruleset = this.ruleset.value();
      untracked(() => {
        if (this.store.character()?.id !== character.id) this.store.init(character, ruleset);
      });
    });
    const title = inject(Title);
    effect(() => {
      const name = this.store.character()?.name;
      if (name) title.setTitle(`${name} · Personajes · Vampiro`);
    });
  }

  protected setPriority(category: 'attribute' | 'ability', group: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value !== '') this.store.setPriority(category, group, Number(value));
  }

  protected async save(): Promise<void> {
    this.notice.set(undefined);
    if (await this.store.save()) this.notice.set('Ficha guardada.');
  }

  protected async complete(): Promise<void> {
    this.notice.set(undefined);
    if (await this.store.complete())
      this.notice.set('Ficha completada. Ya puedes llevarla a una sala.');
  }

  /** "(3 de 7)" para un presupuesto, o vacío si aún no tiene puntos disponibles. */
  protected counterText(path: string): string {
    const b = this.store.budget(path);
    return b && b.available > 0 ? `(${b.spent} de ${b.available})` : '';
  }

  private keysOf(category: string): string[] {
    return (this.store.ruleset()?.catalog ?? [])
      .filter((t) => t.category === category)
      .map((t) => t.key);
  }
}
