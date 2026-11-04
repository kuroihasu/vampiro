import { PASSWORD_MAX_LENGTH, type LoginRequest } from '@vampiro/shared';
import { IsEmail, IsString, MaxLength } from 'class-validator';
import { NormalizeEmail } from '../../../common/transforms.js';

export class LoginDto implements LoginRequest {
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  // Sin longitud mínima: el login no debe revelar la política de contraseñas.
  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}
