import type { EditionId } from '../editions.js';

export const WIKI_CATEGORIES = [
  { id: 'clanes', name: 'Clanes' },
  { id: 'disciplinas', name: 'Disciplinas' },
  { id: 'atributos', name: 'Atributos' },
  { id: 'habilidades', name: 'Habilidades' },
  { id: 'trasfondos', name: 'Trasfondos' },
  { id: 'reglas', name: 'Reglas' },
] as const;

export type WikiCategoryId = (typeof WIKI_CATEGORIES)[number]['id'];

export interface WikiCategory {
  id: WikiCategoryId;
  name: string;
  /** Artículos publicados en la categoría. */
  count: number;
}

export interface WikiArticleSummary {
  slug: string;
  title: string;
  category: WikiCategoryId;
  editions: EditionId[];
  traitKey?: string;
  updatedAt: string;
}

export interface WikiArticle extends WikiArticleSummary {
  /** Markdown sin procesar. El cliente lo renderiza y lo sanea. */
  bodyMarkdown: string;
}

export function isWikiCategoryId(value: unknown): value is WikiCategoryId {
  return typeof value === 'string' && WIKI_CATEGORIES.some((c) => c.id === value);
}

/** Crear o reemplazar un artículo (solo administradores). */
export interface WikiArticleInput {
  slug: string;
  title: string;
  category: WikiCategoryId;
  editions: EditionId[];
  traitKey?: string;
  bodyMarkdown: string;
}

export const WIKI_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const WIKI_TITLE_MAX_LENGTH = 120;
export const WIKI_BODY_MAX_LENGTH = 20_000;
