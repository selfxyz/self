// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { sha256 } from '@noble/hashes/sha256';

/**
 * Short authentication string for the extension link channel: both ends hash
 * the ECDH shared secret and render the same emojis, so the user can visually
 * confirm the encryption keys match before trusting the transfer.
 */

const SAS_CONTEXT = 'self-ext-link-sas-v1';

// 64 entries so a byte maps uniformly. Order is part of the protocol - never
// reorder or replace entries, only append in a new context version.
export const SAS_EMOJIS = [
  '🐶', '🐱', '🦊', '🐻', '🐼', '🐸', '🐵', '🐔',
  '🦉', '🦄', '🐝', '🦋', '🐢', '🐙', '🦀', '🐬',
  '🌵', '🌲', '🍀', '🌻', '🌙', '⭐', '🔥', '🌈',
  '🍎', '🍌', '🍇', '🍓', '🥝', '🍕', '🍔', '🌮',
  '🍩', '🍪', '🎂', '☕', '🎈', '🎁', '🎨', '🎧',
  '🎸', '🥁', '⚽', '🏀', '🎾', '🎲', '🚗', '🚲',
  '✈️', '🚀', '⛵', '⏰', '🔑', '🔒', '📌', '✂️',
  '🧲', '💎', '🪁', '🧸', '📚', '💡', '🔔', '🗺️',
];

export function sasEmojis(sharedSecret: Uint8Array, count = 4): string[] {
  const context = new TextEncoder().encode(SAS_CONTEXT);
  const input = new Uint8Array(context.length + sharedSecret.length);
  input.set(context);
  input.set(sharedSecret, context.length);
  const digest = sha256(input);
  return Array.from(digest.slice(0, count), byte => SAS_EMOJIS[byte % SAS_EMOJIS.length]);
}
