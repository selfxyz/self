// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';

const TRANSFER_LABEL = 'self-ext-transfer-v3';
const SAS_LABEL = 'self-ext-link-sas-v3';

export const LINK_SECRET_BYTES = 32;

export const SAS_LENGTH = 6;

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
  sessionId: string;
  receiverPublicKey: string;
  senderPublicKey: string;
  linkSecret: string;
}

const b64ToBytes = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

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

function linkSalt(binding: TransferBinding): Uint8Array {
  return b64ToBytes(binding.linkSecret);
}

const utf8 = (value: string) => new TextEncoder().encode(value);

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

export function deriveTransferKey(sharedSecretX: Uint8Array, binding: TransferBinding): Uint8Array {
  return hkdf(sha256, sharedSecretX, linkSalt(binding), transferTranscript(binding), 32);
}

export function transferAad(binding: TransferBinding): Uint8Array {
  return transferTranscript(binding);
}

export function sasEmojis(sharedSecretX: Uint8Array, binding: TransferBinding, count = SAS_LENGTH): string[] {
  const salt = new Uint8Array(linkSalt(binding).length + SAS_LABEL.length);
  salt.set(linkSalt(binding));
  salt.set(utf8(SAS_LABEL), linkSalt(binding).length);
  const digest = hkdf(sha256, sharedSecretX, salt, transferTranscript(binding), count);
  return Array.from(digest, byte => SAS_EMOJIS[byte % SAS_EMOJIS.length]);
}
