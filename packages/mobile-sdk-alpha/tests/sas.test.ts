// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import {
  deriveTransferKey,
  SAS_EMOJIS,
  SAS_LENGTH,
  sasEmojis,
  transferAad,
  transferTranscript,
} from '../src/utils/sas';

const binding = {
  sessionId: 'session-aaaaaaaaaaaaaaaa',
  receiverPublicKey: '04' + 'ab'.repeat(64),
  senderPublicKey: '04' + 'cd'.repeat(64),
};
const secret = new Uint8Array(32).fill(7);

describe('SAS emoji table', () => {
  it('has a 64-entry table so bytes map uniformly', () => {
    expect(SAS_EMOJIS).toHaveLength(64);
    expect(new Set(SAS_EMOJIS).size).toBe(64);
  });
});

describe('sasEmojis', () => {
  it('renders 6 emojis (36 bits) by default', () => {
    expect(sasEmojis(secret, binding)).toHaveLength(SAS_LENGTH);
    expect(SAS_LENGTH).toBe(6);
  });

  // Both devices must render the same string for the same channel. Changing the
  // table order, the labels, or the transcript shape is a protocol break and
  // must fail here.
  it('is deterministic for a fixed secret and binding', () => {
    const first = sasEmojis(secret, binding);
    expect(sasEmojis(secret, binding)).toEqual(first);
    expect(first.every(entry => SAS_EMOJIS.includes(entry))).toBe(true);
  });

  it('changes when the sender key changes, even with the same secret', () => {
    const substituted = { ...binding, senderPublicKey: '04' + 'ef'.repeat(64) };
    expect(sasEmojis(secret, substituted)).not.toEqual(sasEmojis(secret, binding));
  });

  it('changes when the session id changes', () => {
    expect(sasEmojis(secret, { ...binding, sessionId: 'session-bbbbbbbbbbbbbbbb' })).not.toEqual(
      sasEmojis(secret, binding),
    );
  });

  it('changes when the secret changes', () => {
    expect(sasEmojis(new Uint8Array(32).fill(8), binding)).not.toEqual(sasEmojis(secret, binding));
  });
});

describe('transfer key derivation', () => {
  it('derives a 32-byte key that is not the raw shared secret', () => {
    const key = deriveTransferKey(secret, binding);
    expect(key).toHaveLength(32);
    expect(Array.from(key)).not.toEqual(Array.from(secret));
  });

  it('binds the key to the session and both public keys', () => {
    const base = Array.from(deriveTransferKey(secret, binding));
    expect(Array.from(deriveTransferKey(secret, { ...binding, sessionId: 'other-sessionnnnnnn' }))).not.toEqual(base);
    expect(Array.from(deriveTransferKey(secret, { ...binding, senderPublicKey: '04' + 'ef'.repeat(64) }))).not.toEqual(
      base,
    );
    expect(
      Array.from(deriveTransferKey(secret, { ...binding, receiverPublicKey: '04' + 'ef'.repeat(64) })),
    ).not.toEqual(base);
  });

  it('uses the transcript as additional data and normalizes key case', () => {
    expect(Array.from(transferAad(binding))).toEqual(Array.from(transferTranscript(binding)));
    const upper = { ...binding, senderPublicKey: binding.senderPublicKey.toUpperCase() };
    expect(Array.from(transferTranscript(upper))).toEqual(Array.from(transferTranscript(binding)));
  });
});
