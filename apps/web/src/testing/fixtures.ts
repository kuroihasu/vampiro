import type { AuthResponse } from '@vampiro/shared';

/** Respuesta de login/refresh para los tests. */
export const authResponse = (accessToken = 'token-1'): AuthResponse => ({
  accessToken,
  expiresIn: 900,
  user: {
    id: 'u1',
    email: 'nadia@example.com',
    displayName: 'Nadia',
    role: 'user',
    createdAt: '2026-11-04T00:00:00.000Z',
  },
});
