import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';

/** Hash de contraseñas con argon2id (parámetros por defecto de la librería, recomendados por OWASP). */
@Injectable()
export class PasswordHasher {
  private dummyHash?: Promise<string>;

  hash(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /**
   * Verifica contra un hash de relleno y siempre devuelve false. Se usa cuando el email
   * no existe, para que el tiempo de respuesta no revele qué cuentas hay.
   */
  async verifyDummy(password: string): Promise<false> {
    this.dummyHash ??= this.hash('contraseña-de-relleno-para-igualar-tiempos');
    await this.verify(await this.dummyHash, password);
    return false;
  }
}
