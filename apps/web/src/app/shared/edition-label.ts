import type { EditionId } from '@vampiro/shared';

/** Nombre corto de cada edición, para etiquetas y tarjetas. */
export const EDITION_SHORT: Record<EditionId, string> = {
  v20: 'V20',
  v5: 'V5',
  'dark-ages': 'Edad Oscura',
  revised: 'Revisada',
};

/** Una línea que resume cada edición en la portada. */
export const EDITION_TAGLINE: Record<EditionId, string> = {
  v20: 'El clásico de la Mascarada: prioridades, gratuitos y dificultades.',
  v5: 'Hambre, Potencia de sangre y tiradas con críticos sucios.',
  'dark-ages': 'Las noches feudales, con Caminos en lugar de Humanidad.',
  revised: 'La edición revisada, en preparación.',
};
