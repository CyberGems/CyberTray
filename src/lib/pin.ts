/**
 * Derivación del PIN de la bóveda.
 *
 * El PIN nunca se persiste en claro: se deriva con PBKDF2-SHA256 y un salt
 * aleatorio por instalación. El hash vive en el config local; el PIN en claro
 * solo existe mientras el usuario lo escribe en el campo.
 */

const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH_BITS = 256;
const SALT_LENGTH_BYTES = 16;

const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('WebCrypto is not available in this context');
  }
  return subtle;
}

/** Comparación en tiempo (casi) constante para evitar filtraciones por temporización. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function derive(pin: string, salt: Uint8Array): Promise<string> {
  const subtle = getSubtle();
  const key = await subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    KEY_LENGTH_BITS
  );
  return toBase64(new Uint8Array(bits));
}

/** Deriva un par hash/salt nuevo para el PIN indicado. */
export async function hashPin(pin: string): Promise<{ hash: string; salt: string }> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
  const hash = await derive(pin, salt);
  return { hash, salt: toBase64(salt) };
}

/** Comprueba el PIN contra el par hash/salt almacenado. */
export async function verifyPin(pin: string, hash?: string, salt?: string): Promise<boolean> {
  if (!hash || !salt) return false;
  try {
    const candidate = await derive(pin, fromBase64(salt));
    return timingSafeEqual(candidate, hash);
  } catch {
    return false;
  }
}
