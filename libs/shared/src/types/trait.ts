/** Categorías del catálogo de rasgos. Alimentan la wiki, los tooltips, la ficha y los dados. */
export type TraitCategory =
  'attribute' | 'ability' | 'discipline' | 'background' | 'virtue' | 'merit' | 'flaw' | 'other';

export interface TraitDefinition {
  /** Clave estable, en minúsculas y sin espacios (p. ej. "fuerza", "celeridad"). */
  key: string;
  name: string;
  category: TraitCategory;
  /** Grupo dentro de la categoría (p. ej. "physical" para atributos, "talents" para habilidades). */
  group?: string;
  /** Texto corto para el tooltip. El texto largo vive en la wiki. */
  summary: string;
  /** Descripción por nivel: índice 0 = nivel 1. */
  levels?: string[];
  /** Puntos con los que empieza todo personaje (p. ej. 1 en atributos de V20). */
  base?: number;
  max?: number;
  /** Méritos y defectos: puntos que cuesta (mérito) o que devuelve (defecto). */
  cost?: number;
  requires?: TraitRequirement;
}

/** Requisitos para tomar un mérito o defecto. */
export interface TraitRequirement {
  /** Valor mínimo (total) de otros rasgos, p. ej. { destreza: 3 }. */
  minTraits?: Record<string, number>;
  /** Solo estos clanes. */
  clans?: string[];
  /** Todos menos estos clanes. */
  notClans?: string[];
}
