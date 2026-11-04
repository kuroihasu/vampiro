import {
  CHARACTER_CONCEPT_MAX_LENGTH,
  CHARACTER_NAME_MAX_LENGTH,
  type CharacterSheet,
  type CreateCharacterRequest,
  EDITION_IDS,
  type EditionId,
  type EvaluateCharacterRequest,
  type UpdateCharacterRequest,
} from '@vampiro/shared';
import { IsIn, IsISO8601, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { Trim } from '../../../common/transforms.js';
import { IsCharacterSheet } from '../../../common/validators.js';

export class CreateCharacterDto implements CreateCharacterRequest {
  @IsIn(EDITION_IDS)
  edition!: EditionId;

  @Trim()
  @IsString()
  @Length(1, CHARACTER_NAME_MAX_LENGTH)
  name!: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(CHARACTER_CONCEPT_MAX_LENGTH)
  concept?: string;
}

export class UpdateCharacterDto implements UpdateCharacterRequest {
  @Trim()
  @IsString()
  @Length(1, CHARACTER_NAME_MAX_LENGTH)
  name!: string;

  @Trim()
  @IsString()
  @MaxLength(CHARACTER_CONCEPT_MAX_LENGTH)
  concept!: string;

  @IsCharacterSheet()
  sheet!: CharacterSheet;

  @IsISO8601({ strict: true })
  updatedAt!: string;
}

export class EvaluateCharacterDto implements EvaluateCharacterRequest {
  @IsOptional()
  @IsCharacterSheet()
  sheet?: CharacterSheet;

  @IsOptional()
  @IsIn(['draft', 'complete'])
  mode?: 'draft' | 'complete';
}

export class ListCharactersQuery {
  @IsOptional()
  @IsIn(EDITION_IDS)
  edicion?: EditionId;
}
