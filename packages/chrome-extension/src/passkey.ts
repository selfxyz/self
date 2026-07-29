// Optional passkey (Touch ID) unlock: wraps the vault key under a KEK derived
// from the WebAuthn PRF extension, so unlocking is a platform-authenticator
// prompt instead of typing the password. The password remains the fallback and
// the PRF secret is never stored.
//
// Requirements: Chrome 122+ lets extension pages call WebAuthn with an rpId
// covered by host_permissions (here self.xyz); PRF via the platform
// authenticator needs Chrome 132+ (macOS 15 iCloud Keychain, Windows Hello on
// recent builds). If either is missing, enabling fails with a clear error.

import type { Envelope } from './crypto';
import { b64, decryptEnvelope, encryptEnvelope } from './crypto';
import { currentKeyRaw, initializeWithKey, unlockWithRawKey } from './vault';

const PASSKEY_META_KEY = 'passkeyMeta';
const RP_ID = 'self.xyz';

interface PasskeyMeta {
  v: 1;
  credentialId: string;
  prfSalt: string;
  wrappedKey: Envelope;
}

interface PrfExtensionResults {
  prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } };
}

async function kekFromPrf(prfOutput: ArrayBuffer): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', prfOutput, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(32),
      info: new TextEncoder().encode('self-vault-passkey-kek'),
    },
    material,
    256,
  );
  return crypto.subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function evalPrf(credentialId: Uint8Array, salt: Uint8Array): Promise<ArrayBuffer> {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      rpId: RP_ID,
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: 'public-key', id: credentialId as BufferSource }],
      userVerification: 'required',
      extensions: { prf: { eval: { first: salt as BufferSource } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  if (!assertion) throw new Error('Passkey prompt was cancelled');
  const secret = (assertion.getClientExtensionResults() as PrfExtensionResults).prf?.results?.first;
  if (!secret) throw new Error('Authenticator returned no PRF secret');
  return secret;
}

async function readPasskeyMeta(): Promise<PasskeyMeta | null> {
  const record = await chrome.storage.local.get(PASSKEY_META_KEY);
  return (record[PASSKEY_META_KEY] as PasskeyMeta | undefined) ?? null;
}

export async function isPasskeyEnabled(): Promise<boolean> {
  return (await readPasskeyMeta()) !== null;
}

/** Drops the wrapped key. The credential itself stays in the platform keychain but becomes inert. */
export async function disablePasskeyUnlock(): Promise<void> {
  await chrome.storage.local.remove(PASSKEY_META_KEY);
}

async function createPrfCredentialSecret(prfSalt: Uint8Array): Promise<{ credentialId: Uint8Array; secret: ArrayBuffer }> {
  const credential = (await navigator.credentials.create({
    publicKey: {
      rp: { id: RP_ID, name: 'Self (Spike)' },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)) as BufferSource,
        name: 'self-vault',
        displayName: 'Self vault',
      },
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        userVerification: 'required',
      },
      extensions: { prf: { eval: { first: prfSalt as BufferSource } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error('Passkey creation was cancelled');

  const ext = credential.getClientExtensionResults() as PrfExtensionResults;
  if (!ext.prf?.enabled && !ext.prf?.results?.first) {
    throw new Error('This authenticator does not support the PRF extension');
  }
  const credentialId = new Uint8Array(credential.rawId);
  // Some authenticators return the PRF secret at creation; others need an assertion.
  const secret = ext.prf?.results?.first ?? (await evalPrf(credentialId, prfSalt));
  return { credentialId, secret };
}

async function wrapAndStoreKey(rawKey: Uint8Array): Promise<void> {
  const prfSalt = crypto.getRandomValues(new Uint8Array(32));
  const { credentialId, secret } = await createPrfCredentialSecret(prfSalt);
  const kek = await kekFromPrf(secret);
  const wrappedKey = await encryptEnvelope(kek, rawKey);
  const meta: PasskeyMeta = {
    v: 1,
    credentialId: b64.encode(credentialId),
    prfSalt: b64.encode(prfSalt),
    wrappedKey,
  };
  await chrome.storage.local.set({ [PASSKEY_META_KEY]: meta });
}

/** Creates a PRF-capable passkey and stores the vault key wrapped under it. Vault must be unlocked. */
export async function enablePasskeyUnlock(): Promise<void> {
  const rawKey = await currentKeyRaw();
  if (!rawKey) throw new Error('Vault must be unlocked first');
  await wrapAndStoreKey(rawKey);
}

/** Passkey-only custody: random vault key wrapped under a new passkey, no password involved.
 *  Passkey creation happens first so a cancelled prompt leaves no vault behind. */
export async function setupPasskeyVault(): Promise<void> {
  const rawKey = crypto.getRandomValues(new Uint8Array(32));
  await wrapAndStoreKey(rawKey);
  await initializeWithKey(rawKey);
}

/** Unlocks the vault via the passkey PRF secret. Returns false on wrong/undecryptable key. */
export async function unlockWithPasskey(): Promise<boolean> {
  const meta = await readPasskeyMeta();
  if (!meta) return false;
  const kek = await kekFromPrf(await evalPrf(b64.decode(meta.credentialId), b64.decode(meta.prfSalt)));
  let rawKey: Uint8Array;
  try {
    rawKey = await decryptEnvelope(kek, meta.wrappedKey);
  } catch {
    return false;
  }
  return unlockWithRawKey(rawKey);
}
