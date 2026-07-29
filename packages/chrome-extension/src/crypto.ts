// WebCrypto primitives for the account-transfer envelope and the vault.
//
// Envelope convention (specs/.../plans/CE-01-transfer-protocol.md): P-256 ECDH,
// shared secret = x-coordinate (32 bytes BE) used directly as the AES-256-GCM
// key, 12-byte nonce, 128-bit tag, base64 fields. Public keys travel as
// UNCOMPRESSED hex (04||X||Y) - WebCrypto's raw import needs that; elliptic on
// the phone accepts it natively.

export interface Envelope {
  nonce: string;
  cipherText: string;
  authTag: string;
}

export const b64 = {
  encode(bytes: ArrayBuffer | Uint8Array): string {
    const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let binary = '';
    for (const byte of view) binary += String.fromCharCode(byte);
    return btoa(binary);
  },
  decode(value: string) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  },
};

export const hex = {
  encode(bytes: ArrayBuffer | Uint8Array): string {
    const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    return Array.from(view)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  },
  decode(value: string) {
    const bytes = new Uint8Array(value.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(value.slice(i * 2, i * 2 + 2), 16);
    return bytes;
  },
};

export async function generateEcdhKeyPair(): Promise<{ keyPair: CryptoKeyPair; publicKeyHex: string }> {
  const keyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const raw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  return { keyPair, publicKeyHex: hex.encode(raw) };
}

/** Shared secret = raw ECDH x-coordinate, 32 bytes. Matches elliptic's derive().toArray('be', 32). */
export async function deriveSharedSecretBits(privateKey: CryptoKey, peerPublicKeyHex: string): Promise<Uint8Array> {
  const peerKey = await crypto.subtle.importKey(
    'raw',
    hex.decode(peerPublicKeyHex),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: peerKey }, privateKey, 256));
}

export function aesKeyFromSecret(bits: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', bits as BufferSource, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function deriveSharedKey(privateKey: CryptoKey, peerPublicKeyHex: string): Promise<CryptoKey> {
  return aesKeyFromSecret(await deriveSharedSecretBits(privateKey, peerPublicKeyHex));
}

/** WebCrypto AES-GCM emits ciphertext||tag; the envelope keeps them split like node-forge does. */
export async function encryptEnvelope(key: CryptoKey, plaintext: Uint8Array, aad?: Uint8Array): Promise<Envelope> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const params: AesGcmParams = { name: 'AES-GCM', iv: nonce };
  if (aad) params.additionalData = aad as BufferSource;
  const sealed = new Uint8Array(await crypto.subtle.encrypt(params, key, plaintext as BufferSource));
  return {
    nonce: b64.encode(nonce),
    cipherText: b64.encode(sealed.slice(0, sealed.length - 16)),
    authTag: b64.encode(sealed.slice(sealed.length - 16)),
  };
}

export async function decryptEnvelope(key: CryptoKey, envelope: Envelope, aad?: Uint8Array): Promise<Uint8Array> {
  const cipherText = b64.decode(envelope.cipherText);
  const authTag = b64.decode(envelope.authTag);
  const sealed = new Uint8Array(cipherText.length + authTag.length);
  sealed.set(cipherText);
  sealed.set(authTag, cipherText.length);
  const params: AesGcmParams = { name: 'AES-GCM', iv: b64.decode(envelope.nonce) };
  if (aad) params.additionalData = aad as BufferSource;
  const plain = await crypto.subtle.decrypt(params, key, sealed);
  return new Uint8Array(plain);
}

// --- vault key derivation -----------------------------------------------------

export const PBKDF2_ITERATIONS = 600_000;

export async function deriveVaultKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    material,
    256,
  );
  return importVaultKey(new Uint8Array(bits));
}

export function importVaultKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw as BufferSource, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}

export async function exportVaultKey(key: CryptoKey): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.exportKey('raw', key));
}
