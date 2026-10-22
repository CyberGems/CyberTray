import { describe, expect, it } from 'vitest';
import { hashPin, verifyPin } from './pin';

describe('hashPin / verifyPin', () => {
  it('un PIN correcto valida', async () => {
    const { hash, salt } = await hashPin('1234');
    await expect(verifyPin('1234', hash, salt)).resolves.toBe(true);
  });

  it('un PIN incorrecto no valida', async () => {
    const { hash, salt } = await hashPin('1234');
    await expect(verifyPin('4321', hash, salt)).resolves.toBe(false);
  });

  it('el hash nunca contiene el PIN en claro', async () => {
    const { hash, salt } = await hashPin('1234');
    expect(hash).not.toContain('1234');
    expect(salt).not.toContain('1234');
  });

  it('cada derivación usa un salt distinto', async () => {
    const first = await hashPin('1234');
    const second = await hashPin('1234');
    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
  });

  it('no valida si falta el hash o el salt', async () => {
    await expect(verifyPin('1234', undefined, undefined)).resolves.toBe(false);
    await expect(verifyPin('1234', 'hash', undefined)).resolves.toBe(false);
    await expect(verifyPin('1234', undefined, 'salt')).resolves.toBe(false);
  });

  it('no valida con un salt corrupto', async () => {
    await expect(verifyPin('1234', 'hash', 'no-es-base64!!')).resolves.toBe(false);
  });
});
