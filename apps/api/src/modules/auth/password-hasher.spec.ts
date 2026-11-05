import { PasswordHasher } from './password-hasher.js';

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher();

  it('no guarda la contraseña en claro y la verifica', async () => {
    const hash = await hasher.hash('sangre-y-luna-42');
    expect(hash).not.toContain('sangre-y-luna-42');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    await expect(hasher.verify(hash, 'sangre-y-luna-42')).resolves.toBe(true);
  });

  it('rechaza una contraseña distinta', async () => {
    const hash = await hasher.hash('sangre-y-luna-42');
    await expect(hasher.verify(hash, 'otra-cosa')).resolves.toBe(false);
  });

  it('verifyDummy tarda lo mismo pero siempre falla (usuario inexistente)', async () => {
    await expect(hasher.verifyDummy('lo-que-sea')).resolves.toBe(false);
  });
});
