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
// A stolen storage dump is brute-forceable offline at roughly 10^4-10^5
// guesses/s per GPU against PBKDF2, so the password floor carries real weight.
export const MIN_PASSWORD_LENGTH = 12;
const FAILED_ATTEMPTS_KEY = 'unlockFailures';
const THROTTLE_AFTER = 3;
const THROTTLE_STEP_MS = 15_000;
const THROTTLE_MAX_MS = 5 * 60_000;

interface FailureRecord {
  count: number;
  blockedUntil: number;
}

async function readFailures(): Promise<FailureRecord> {
  const record = await chrome.storage.session.get(FAILED_ATTEMPTS_KEY);
  return (record[FAILED_ATTEMPTS_KEY] as FailureRecord | undefined) ?? { count: 0, blockedUntil: 0 };
}

/** Milliseconds the caller must wait, 0 when unlocking is allowed now. */
export async function unlockCooldownMs(): Promise<number> {
  const { blockedUntil } = await readFailures();
  return Math.max(0, blockedUntil - Date.now());
}

async function recordFailure(): Promise<void> {
  const failures = await readFailures();
  const count = failures.count + 1;
  const over = Math.max(0, count - THROTTLE_AFTER + 1);
  const delay = over > 0 ? Math.min(THROTTLE_MAX_MS, THROTTLE_STEP_MS * 2 ** (over - 1)) : 0;
  await chrome.storage.session.set({
    [FAILED_ATTEMPTS_KEY]: { count, blockedUntil: delay > 0 ? Date.now() + delay : 0 },
  });
}

async function clearFailures(): Promise<void> {
  await chrome.storage.session.remove(FAILED_ATTEMPTS_KEY);
}

/** Rough strength signal for the UI. Not a substitute for the length floor. */
export function passwordStrength(password: string): { score: 0 | 1 | 2 | 3; label: string } {
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(re => re.test(password)).length;
  const long = password.length >= 16;
  const veryLong = password.length >= 20;
  if (password.length < MIN_PASSWORD_LENGTH) return { score: 0, label: 'Too short' };
  if (veryLong && classes >= 3) return { score: 3, label: 'Strong' };
  if (long || classes >= 3) return { score: 2, label: 'Good' };
  return { score: 1, label: 'Weak: add length or variety' };
}
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
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
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
  // Throttle guessing against a live browser (an offline dump is a separate
  // problem, addressed by the length floor and the KDF cost).
  if ((await unlockCooldownMs()) > 0) return false;
  const key = await deriveVaultKey(password, b64.decode(meta.salt), meta.iterations);
  try {
    const canary = await decryptEnvelope(key, meta.canary);
    if (new TextDecoder().decode(canary) !== CANARY_TEXT) {
      await recordFailure();
      return false;
    }
  } catch {
    await recordFailure();
    return false;
  }
  await clearFailures();
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
  await clearFailures();
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
