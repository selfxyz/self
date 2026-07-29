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
 * Security review 2026-07-29 drove three changes from v1:
 * - the raw ECDH x-coordinate is no longer used directly as an AES key,
 * - the key and the SAS are bound to the session id AND both public keys, so
 *   substituting a sender key fails the GCM tag instead of decrypting cleanly,
 * - the SAS widened from 4 to 6 emojis (24 -> 36 bits) so grinding a preimage
 *   against the emojis a user is about to compare is not feasible.
 */

const TRANSFER_LABEL = 'self-ext-transfer-v2';
const SAS_LABEL = 'self-ext-link-sas-v2';

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
  return hkdf(sha256, sharedSecretX, utf8(binding.sessionId), transferTranscript(binding), 32);
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
  const digest = hkdf(sha256, sharedSecretX, utf8(SAS_LABEL), transferTranscript(binding), count);
  return Array.from(digest, byte => SAS_EMOJIS[byte % SAS_EMOJIS.length]);
}
