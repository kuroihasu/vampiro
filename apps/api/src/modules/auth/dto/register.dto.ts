import {
  DISPLAY_NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type RegisterRequest,
} from '@vampiro/shared';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';
import { NormalizeEmail, Trim } from '../../../common/transforms.js';

export class RegisterDto implements RegisterRequest {
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH)
  password!: string;

  @Trim()
  @IsString()
  @Length(2, DISPLAY_NAME_MAX_LENGTH)
  displayName!: string;
}
