import { MAX_DICE, type RollRequest, type RoomDicePoolRequest } from '@vampiro/shared';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../../../common/transforms.js';

export class DicePoolDto implements RoomDicePoolRequest {
  @IsOptional()
  @IsUUID()
  roomCharacterId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]{1,40}$/)
  actionKey?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @Matches(/^[a-z0-9-]{1,40}$/, { each: true })
  traits?: string[];

  @IsOptional()
  @IsInt()
  @Min(-10)
  @Max(10)
  modifier?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  difficulty?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_DICE)
  dice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  hunger?: number;
}

export class RollDto extends DicePoolDto implements RollRequest {
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(80)
  label?: string;
}

export class ListRollsQuery {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  cursor?: string;

  @IsOptional()
  @Matches(/^\d{1,3}$/)
  limit?: string;
}
