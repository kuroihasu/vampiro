import { Transform } from 'class-transformer';

/** Recorta espacios en los extremos de un string antes de validarlo. */
export const Trim = () =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

/** Recorta y pasa a minúsculas (emails). */
export const NormalizeEmail = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
