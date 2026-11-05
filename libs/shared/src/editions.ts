/**
 * Ediciones de Vampiro: la Mascarada soportadas por la app.
 * Una ficha y una sala siempre pertenecen a una sola edición.
 */
export const EDITION_IDS = ['v20', 'v5', 'dark-ages', 'revised'] as const;

export type EditionId = (typeof EDITION_IDS)[number];

export interface EditionInfo {
  id: EditionId;
  name: string;
  /** false mientras su ruleset no esté cargado. */
  available: boolean;
}

export const EDITIONS: readonly EditionInfo[] = [
  { id: 'v20', name: 'Vampiro: la Mascarada 20º Aniversario (V20)', available: true },
  { id: 'v5', name: 'Vampiro: la Mascarada 5ª Edición (V5)', available: true },
  { id: 'dark-ages', name: 'Vampiro: Edad Oscura', available: false },
  { id: 'revised', name: 'Vampiro: la Mascarada Revisada', available: false },
];

export function isEditionId(value: unknown): value is EditionId {
  return typeof value === 'string' && (EDITION_IDS as readonly string[]).includes(value);
}
