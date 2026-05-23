// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import { getPerkRailContent, getPerkRailLabel, getPerksForIdType } from '../../../src/flows/onboarding/perks';

describe('onboarding perks', () => {
  it('filters perks to entries that have renderLogos', () => {
    const perks = getPerksForIdType('p');

    expect(perks.length).toBeGreaterThan(0);
    expect(perks.every(perk => typeof perk.renderLogos === 'function')).toBe(true);
  });

  it('keeps rail label format', () => {
    expect(getPerkRailLabel([])).toBe('Eligible for 0 perks');
    expect(getPerkRailLabel([{ id: 'google_cloud_faucet', label: 'Google Cloud Faucet', renderLogos: () => [] }])).toBe(
      'Eligible for 1 perk',
    );
  });

  it('returns null content when an id type has no renderable perks', () => {
    expect(getPerkRailContent('unknown')).toBeNull();
  });

  it('counts perks (not logos) so multi-logo perks stay singular', () => {
    const content = getPerkRailContent('p');

    expect(content).not.toBeNull();
    expect(content!.perks).toHaveLength(1);
    expect(content!.logos.length).toBeGreaterThanOrEqual(2);
    expect(content!.label).toBe('Eligible for 1 perk');
  });
});
