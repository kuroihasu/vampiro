export type UserRole = 'user' | 'admin';

/** Usuario tal como lo ve el cliente (nunca incluye el hash de la contraseña). */
export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateMeRequest {
  displayName?: string;
}

/**
 * Respuesta de register, login y refresh. El refresh token no viaja en el cuerpo:
 * va en una cookie httpOnly limitada a /api/v1/auth.
 */
export interface AuthResponse {
  accessToken: string;
  /** Segundos de vida del access token. */
  expiresIn: number;
  user: PublicUser;
}

/** Reglas de las credenciales, compartidas por el formulario y la validación de la API. */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;
export const DISPLAY_NAME_MAX_LENGTH = 40;
