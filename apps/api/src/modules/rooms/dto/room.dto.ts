import {
  type CreateRoomRequest,
  EDITION_IDS,
  type EditionId,
  type InviteCodeRequest,
  type JoinRoomRequest,
  type LinkCharacterRequest,
  parseRoomConfig,
  ROOM_NAME_MAX_LENGTH,
  type RoomConfig,
  type UpdateRoomCharacterRequest,
} from '@vampiro/shared';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateBy,
  type ValidationArguments,
} from 'class-validator';
import { Trim } from '../../../common/transforms.js';

function IsRoomConfig(): PropertyDecorator {
  return ValidateBy({
    name: 'isRoomConfig',
    validator: {
      validate: (value: unknown) => parseRoomConfig(value).ok,
      defaultMessage: (args?: ValidationArguments) => {
        const result = parseRoomConfig(args?.value);
        return result.ok ? 'config inválida' : `config: ${result.errors.slice(0, 5).join('; ')}`;
      },
    },
  });
}

export class CreateRoomDto implements CreateRoomRequest {
  @Trim()
  @IsString()
  @Length(1, ROOM_NAME_MAX_LENGTH)
  name!: string;

  @IsIn(EDITION_IDS)
  edition!: EditionId;

  @IsOptional()
  @IsRoomConfig()
  config?: RoomConfig;
}

export class InviteCodeDto implements InviteCodeRequest {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24 * 30)
  expiresInHours?: number;
}

export class JoinRoomDto implements JoinRoomRequest {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Length(4, 16)
  code!: string;
}

export class LinkCharacterDto implements LinkCharacterRequest {
  @IsUUID()
  characterId!: string;

  @IsOptional()
  @IsBoolean()
  isNpc?: boolean;
}

export class UpdateRoomCharacterDto implements UpdateRoomCharacterRequest {
  @IsOptional()
  @IsBoolean()
  isNpc?: boolean;
}
