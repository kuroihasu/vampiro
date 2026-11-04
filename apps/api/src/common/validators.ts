import { parseCharacterSheet } from '@vampiro/shared';
import { ValidateBy, type ValidationArguments, type ValidationOptions } from 'class-validator';

/** Valida que el valor tenga la forma de un CharacterSheet (no aplica reglas del juego). */
export function IsCharacterSheet(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isCharacterSheet',
      validator: {
        validate: (value: unknown) => parseCharacterSheet(value).ok,
        defaultMessage: (args?: ValidationArguments) => {
          const result = parseCharacterSheet(args?.value);
          return result.ok
            ? 'ficha inválida'
            : `${args?.property ?? 'sheet'}: ${result.errors.slice(0, 5).join('; ')}`;
        },
      },
    },
    options,
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Los ids de la base son UUID; cualquier otra cosa se trata como "no existe". */
export const isUuid = (value: string): boolean => UUID.test(value);
