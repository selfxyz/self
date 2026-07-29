// Password-encrypted secure storage backing the bridge `secureStorage` domain.
//
// Layout in chrome.storage.local:
//   vaultMeta          {v, salt, iterations, canary}  - canary decrypts to CANARY_TEXT
//   vault:<key>        Envelope JSON (AES-256-GCM under the password-derived key)
// The unlocked session key lives in chrome.storage.session (memory-only,
// cleared when the browser exits), so every extension page can use the vault
// after one unlock.

import type { Envelope } from './crypto';
import { b64, decryptEnvelope, deriveVaultKey, encryptEnvelope, exportVaultKey, importVaultKey, PBKDF2_ITERATIONS } from './crypto';

const META_KEY = 'vaultMeta';
const SESSION_KEY = 'vaultSessionKey';
const VAULT_PREFIX = 'vault:';
const CANARY_TEXT = 'self-vault';

// Session policy (spec: SPEC-PRODUCTION.html, session & lock policy): an
// unlocked session ends at the absolute TTL, after the idle TTL without a
// vault access, on manual/OS lock, or on browser exit (storage.session).
const SESSION_ABSOLUTE_TTL_MS = 12 * 60 * 60 * 1000;
// meta.iterations comes back from storage an attacker with disk access could
// edit; never derive with less work than we shipped with.
const MIN_PBKDF2_ITERATIONS = 600_000;
const SESSION_IDLE_TTL_MS = 30 * 60 * 1000;

interface SessionRecord {
  key: string;
  expiresAt: number;
  lastActivityAt: number;
}

export class VaultLockedError extends Error {
  code = 'VAULT_LOCKED';
  constructor() {
    super('Vault is locked');
  }
}

interface VaultMeta {
  v: 1;
  salt: string;
  iterations: number;
  canary: Envelope;
  /** Absent on vaults created before passkey support: those are password vaults. */
  mode?: 'password' | 'passkey';
}

async function readMeta(): Promise<VaultMeta | null> {
  const record = await chrome.storage.local.get(META_KEY);
  return (record[META_KEY] as VaultMeta | undefined) ?? null;
}

async function startSession(rawKey: string): Promise<void> {
  const now = Date.now();
  const session: SessionRecord = {
    key: rawKey,
    expiresAt: now + SESSION_ABSOLUTE_TTL_MS,
    lastActivityAt: now,
  };
  await chrome.storage.session.set({ [SESSION_KEY]: session });
}

/** Returns the session key if the session is live; self-locks on TTL violations.
 *  Each successful access refreshes the idle window (never the absolute one). */
async function sessionKey(): Promise<CryptoKey | null> {
  const record = await chrome.storage.session.get(SESSION_KEY);
  const session = record[SESSION_KEY] as SessionRecord | string | undefined;
  if (!session) return null;
  // Pre-TTL sessions stored the bare key string; treat them as expired.
  if (typeof session === 'string') {
    await chrome.storage.session.remove(SESSION_KEY);
    return null;
  }
  const now = Date.now();
  if (now > session.expiresAt || now - session.lastActivityAt > SESSION_IDLE_TTL_MS) {
    await chrome.storage.session.remove(SESSION_KEY);
    return null;
  }
  session.lastActivityAt = now;
  await chrome.storage.session.set({ [SESSION_KEY]: session });
  return importVaultKey(b64.decode(session.key));
}

export async function isInitialized(): Promise<boolean> {
  return (await readMeta()) !== null;
}

export async function isUnlocked(): Promise<boolean> {
  return (await sessionKey()) !== null;
}

export async function initialize(password: string): Promise<void> {
  if (await isInitialized()) throw new Error('A vault already exists in this browser; reset it first');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveVaultKey(password, salt, PBKDF2_ITERATIONS);
  const canary = await encryptEnvelope(key, new TextEncoder().encode(CANARY_TEXT));
  const meta: VaultMeta = { v: 1, salt: b64.encode(salt), iterations: PBKDF2_ITERATIONS, canary, mode: 'password' };
  await chrome.storage.local.set({ [META_KEY]: meta });
  await startSession(b64.encode(await exportVaultKey(key)));
}

/** Creates a vault around a caller-provided random key (passkey custody - no password exists). */
export async function initializeWithKey(raw: Uint8Array): Promise<void> {
  if (await isInitialized()) throw new Error('A vault already exists in this browser; reset it first');
  const key = await importVaultKey(raw);
  const canary = await encryptEnvelope(key, new TextEncoder().encode(CANARY_TEXT));
  const meta: VaultMeta = { v: 1, salt: '', iterations: 0, canary, mode: 'passkey' };
  await chrome.storage.local.set({ [META_KEY]: meta });
  await startSession(b64.encode(raw));
}

export async function vaultMode(): Promise<'password' | 'passkey' | null> {
  const meta = await readMeta();
  if (!meta) return null;
  return meta.mode ?? 'password';
}

export async function unlock(password: string): Promise<boolean> {
  const meta = await readMeta();
  if (!meta) return false;
  // Passkey-only vault: there is no password to verify.
  if ((meta.mode ?? 'password') === 'passkey' || !meta.salt || meta.iterations < MIN_PBKDF2_ITERATIONS) {
    return false;
  }
  const key = await deriveVaultKey(password, b64.decode(meta.salt), meta.iterations);
  try {
    const canary = await decryptEnvelope(key, meta.canary);
    if (new TextDecoder().decode(canary) !== CANARY_TEXT) return false;
  } catch {
    return false;
  }
  await startSession(b64.encode(await exportVaultKey(key)));
  return true;
}

export async function lock(): Promise<void> {
  await chrome.storage.session.remove(SESSION_KEY);
}

/** Deletes everything account-related: vault meta, encrypted entries, any
 *  pre-vault key material, the passkey wrap, and the session key. "Delete this
 *  browser's account" must leave nothing behind. The phone copy is unaffected. */
export async function reset(): Promise<void> {
  const all = await chrome.storage.local.get(null);
  const keys = Object.keys(all).filter(
    key =>
      key === META_KEY ||
      key === 'passkeyMeta' ||
      key.startsWith(VAULT_PREFIX) ||
      key.startsWith('cryptoKey:'),
  );
  if (keys.length > 0) await chrome.storage.local.remove(keys);
  await chrome.storage.session.remove(SESSION_KEY);
}

/** Raw vault key of the current unlocked session (for passkey wrapping). */
export async function currentKeyRaw(): Promise<Uint8Array | null> {
  const key = await sessionKey();
  return key ? exportVaultKey(key) : null;
}

/** Unlocks from a raw key (e.g. unwrapped by a passkey), canary-checked like a password unlock. */
export async function unlockWithRawKey(raw: Uint8Array): Promise<boolean> {
  const meta = await readMeta();
  if (!meta) return false;
  const key = await importVaultKey(raw);
  try {
    const canary = await decryptEnvelope(key, meta.canary);
    if (new TextDecoder().decode(canary) !== CANARY_TEXT) return false;
  } catch {
    return false;
  }
  await startSession(b64.encode(raw));
  return true;
}

export interface Vault {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export function createVault(): Vault {
  async function requireKey(): Promise<CryptoKey> {
    const key = await sessionKey();
    if (!key) throw new VaultLockedError();
    return key;
  }

  return {
    async get(key: string): Promise<string | null> {
      const cryptoKey = await requireKey();
      const storageKey = VAULT_PREFIX + key;
      const record = await chrome.storage.local.get(storageKey);
      const envelope = record[storageKey] as Envelope | undefined;
      if (!envelope) return null;
      return new TextDecoder().decode(await decryptEnvelope(cryptoKey, envelope));
    },

    async set(key: string, value: string): Promise<void> {
      const cryptoKey = await requireKey();
      const envelope = await encryptEnvelope(cryptoKey, new TextEncoder().encode(value));
      await chrome.storage.local.set({ [VAULT_PREFIX + key]: envelope });
    },

    async remove(key: string): Promise<void> {
      await requireKey();
      await chrome.storage.local.remove(VAULT_PREFIX + key);
    },
  };
}
