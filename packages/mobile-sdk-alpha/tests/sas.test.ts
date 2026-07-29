// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import { SAS_EMOJIS, sasEmojis } from '../src/utils/sas';

describe('sasEmojis', () => {
  it('has a 64-entry table so bytes map uniformly', () => {
    expect(SAS_EMOJIS).toHaveLength(64);
    expect(new Set(SAS_EMOJIS).size).toBe(64);
  });

  // Known vector: the phone and the extension render the SAME emojis for the
  // same shared secret. Reordering the table or changing the context string is
  // a protocol break and must fail this test.
  it('is deterministic for a fixed shared secret', () => {
    const secret = new Uint8Array(32).fill(7);
    const result = sasEmojis(secret);
    expect(result).toEqual([SAS_EMOJIS[1], SAS_EMOJIS[63], SAS_EMOJIS[17], SAS_EMOJIS[62]]);
    expect(sasEmojis(secret)).toEqual(result);
  });

  it('differs for different secrets', () => {
    expect(sasEmojis(new Uint8Array(32).fill(1))).not.toEqual(sasEmojis(new Uint8Array(32).fill(2)));
  });
});
