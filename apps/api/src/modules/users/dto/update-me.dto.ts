import { DISPLAY_NAME_MAX_LENGTH, type UpdateMeRequest } from '@vampiro/shared';
import { IsOptional, IsString, Length } from 'class-validator';
import { Trim } from '../../../common/transforms.js';

export class UpdateMeDto implements UpdateMeRequest {
  @IsOptional()
  @Trim()
  @IsString()
  @Length(2, DISPLAY_NAME_MAX_LENGTH)
  displayName?: string;
}
