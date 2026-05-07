// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import { getDocumentBadgeLabel, getDocumentPerkLabel } from '../../../src/flows/onboarding/badges';
import { getPerkRailLabel, PERKS } from '../../../src/flows/onboarding/perks';

describe('onboarding badges', () => {
  it('uses scan-method copy for document badges', () => {
    expect(getDocumentBadgeLabel('p')).toBe('Hi-security');
    expect(getDocumentBadgeLabel('i')).toBe('Hi-security');
    expect(getDocumentBadgeLabel('a')).toBe('QR code scan');
    expect(getDocumentBadgeLabel('kyc')).toBe('Photo ID scan');
    expect(getDocumentBadgeLabel('unknown')).toBe('Document scan');
  });

  it('returns count-based perk labels', () => {
    expect(getDocumentPerkLabel('p')).toBe('Eligible for 1 perk');
    expect(getDocumentPerkLabel('unknown')).toBeNull();
  });

  it('formats multi-perk labels predictably', () => {
    const googlePerk = PERKS.google_usdt_faucet;
    expect(getPerkRailLabel([googlePerk, googlePerk])).toBe('Eligible for 2 perks');
  });
});
