// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';

/**
 * Account-transfer channel binding for the browser extension link flow.
 * Shared by the phone (sender) and the extension (receiver) so the two ends
 * cannot drift: transcript, envelope key, GCM additional data, and the emoji
 * short authentication string all derive from the same inputs.
 *
 * Security review 2026-07-29 drove these changes:
 * - v2: the raw ECDH x-coordinate is no longer used directly as an AES key,
 *   and the key plus the SAS are bound to the session id and both public keys,
 *   so substituting a sender key fails the GCM tag rather than decrypting
 *   cleanly. SAS widened from 4 to 6 emojis.
 * - v3: the QR carries a 32-byte `linkSecret` that never reaches the relayer
 *   and is mixed in as the HKDF salt, so ONLY a device that physically scanned
 *   the QR can derive an authenticating key. Sender authentication is now
 *   cryptographic (256-bit) instead of resting on a human emoji comparison.
 *   The emoji step remains as the defense for an observed QR (shoulder-surf,
 *   screen share, remote support) and as the moment the user authorizes the
 *   send. Spec: SPEC-PRODUCTION.html, link channel authentication.
 */

const TRANSFER_LABEL = 'self-ext-transfer-v3';
const SAS_LABEL = 'self-ext-link-sas-v3';

/** Bytes of QR-carried secret that authenticate the link channel. */
export const LINK_SECRET_BYTES = 32;

/** Emoji count in the short authentication string: 6 x log2(64) = 36 bits. */
export const SAS_LENGTH = 6;

// 64 entries so a byte maps uniformly. Order is part of the protocol - never
// reorder or replace entries, only append under a new label version.
export const SAS_EMOJIS = [
  '🐶',
  '🐱',
  '🦊',
  '🐻',
  '🐼',
  '🐸',
  '🐵',
  '🐔',
  '🦉',
  '🦄',
  '🐝',
  '🦋',
  '🐢',
  '🐙',
  '🦀',
  '🐬',
  '🌵',
  '🌲',
  '🍀',
  '🌻',
  '🌙',
  '⭐',
  '🔥',
  '🌈',
  '🍎',
  '🍌',
  '🍇',
  '🍓',
  '🥝',
  '🍕',
  '🍔',
  '🌮',
  '🍩',
  '🍪',
  '🎂',
  '☕',
  '🎈',
  '🎁',
  '🎨',
  '🎧',
  '🎸',
  '🥁',
  '⚽',
  '🏀',
  '🎾',
  '🎲',
  '🚗',
  '🚲',
  '✈️',
  '🚀',
  '⛵',
  '⏰',
  '🔑',
  '🔒',
  '📌',
  '✂️',
  '🧲',
  '💎',
  '🪁',
  '🧸',
  '📚',
  '💡',
  '🔔',
  '🗺️',
];

export interface TransferBinding {
  /** Transfer session id from the QR. */
  sessionId: string;
  /** Extension (receiver) uncompressed P-256 public key, hex. */
  receiverPublicKey: string;
  /** Phone (sender) ephemeral uncompressed P-256 public key, hex. */
  senderPublicKey: string;
  /**
   * Base64 `linkSecret` from the QR: the out-of-band proof that this sender
   * scanned the code. Never transmitted through the relayer.
   */
  linkSecret: string;
}

const b64ToBytes = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

/** Generates a fresh `linkSecret` for a QR, base64 encoded. */
export function generateLinkSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(LINK_SECRET_BYTES));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function isValidLinkSecret(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  try {
    return b64ToBytes(value).length === LINK_SECRET_BYTES;
  } catch {
    return false;
  }
}

/** HKDF salt: the QR secret, so a non-scanner cannot derive the channel key. */
function linkSalt(binding: TransferBinding): Uint8Array {
  return b64ToBytes(binding.linkSecret);
}

const utf8 = (value: string) => new TextEncoder().encode(value);

/** Canonical, delimited transcript: label, session id, both public keys. */
export function transferTranscript(binding: TransferBinding): Uint8Array {
  return utf8(
    [
      TRANSFER_LABEL,
      binding.sessionId,
      binding.receiverPublicKey.toLowerCase(),
      binding.senderPublicKey.toLowerCase(),
    ].join('|'),
  );
}

/**
 * Envelope key: HKDF-SHA256 over the ECDH shared secret, salted with the
 * session id and bound to the transcript. Replaces using the bare
 * x-coordinate as an AES key.
 */
export function deriveTransferKey(sharedSecretX: Uint8Array, binding: TransferBinding): Uint8Array {
  return hkdf(sha256, sharedSecretX, linkSalt(binding), transferTranscript(binding), 32);
}

/** GCM additional data: a swapped sender key or session id fails the tag. */
export function transferAad(binding: TransferBinding): Uint8Array {
  return transferTranscript(binding);
}

/**
 * Emojis both devices display. Derived from the transcript AND the shared
 * secret, so an attacker cannot compute the target SAS without completing the
 * key agreement the user is about to verify.
 */
export function sasEmojis(sharedSecretX: Uint8Array, binding: TransferBinding, count = SAS_LENGTH): string[] {
  const salt = new Uint8Array(linkSalt(binding).length + SAS_LABEL.length);
  salt.set(linkSalt(binding));
  salt.set(utf8(SAS_LABEL), linkSalt(binding).length);
  const digest = hkdf(sha256, sharedSecretX, salt, transferTranscript(binding), count);
  return Array.from(digest, byte => SAS_EMOJIS[byte % SAS_EMOJIS.length]);
}
