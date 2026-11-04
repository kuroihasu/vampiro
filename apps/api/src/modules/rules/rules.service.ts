import { Injectable } from '@nestjs/common';
import {
  EDITIONS,
  getRuleset,
  isEditionId,
  type EditionInfo,
  type Ruleset,
  type TraitDefinition,
} from '@vampiro/shared';
import { ApiException } from '../../common/api-exception.js';

/** Expone los rulesets de @vampiro/shared al resto de la API. */
@Injectable()
export class RulesService {
  listEditions(): readonly EditionInfo[] {
    return EDITIONS;
  }

  getRuleset(edition: string): Ruleset {
    if (!isEditionId(edition)) {
      throw new ApiException(404, 'NO_ENCONTRADO', `La edición "${edition}" no existe.`);
    }
    const ruleset = getRuleset(edition);
    if (!ruleset) {
      throw new ApiException(
        404,
        'EDICION_NO_DISPONIBLE',
        `La edición "${edition}" aún no está disponible.`,
      );
    }
    return ruleset;
  }

  getTrait(edition: string, key: string): TraitDefinition {
    const trait = this.getRuleset(edition).catalog.find((t) => t.key === key);
    if (!trait) {
      throw new ApiException(404, 'NO_ENCONTRADO', `El rasgo "${key}" no existe en esta edición.`);
    }
    return trait;
  }
}
