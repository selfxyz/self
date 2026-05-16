// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import { getPerkRecordsForIdType, PERKS } from '../../src/data/perks';

describe('shared perks catalog', () => {
  it('returns expected perks for passport id type in order', () => {
    expect(getPerkRecordsForIdType('p').map(perk => perk.id)).toEqual(['google_cloud_faucet']);
  });

  it('returns empty array for unknown id type', () => {
    expect(getPerkRecordsForIdType('unknown')).toEqual([]);
  });

  it('keeps canonical google label', () => {
    expect(PERKS.google_cloud_faucet.label).toBe('Google Cloud Faucet');
  });
});
