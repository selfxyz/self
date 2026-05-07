// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import { getPerkRailLabel, getPerksForIdType } from '../../../src/flows/onboarding/perks';

describe('onboarding perks', () => {
  it('filters perks to entries that have a renderLogo', () => {
    const perks = getPerksForIdType('p');

    expect(perks.length).toBeGreaterThan(0);
    expect(perks.every(perk => typeof perk.renderLogo === 'function')).toBe(true);
  });

  it('keeps rail label format', () => {
    expect(getPerkRailLabel([])).toBe('Eligible for 0 perks');
    expect(
      getPerkRailLabel([{ id: 'google_cloud_faucet', label: 'Google Cloud Faucet', renderLogo: () => null }]),
    ).toBe('Eligible for 1 perk');
  });
});
