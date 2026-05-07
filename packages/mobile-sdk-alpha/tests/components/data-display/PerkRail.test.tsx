// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/* @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';

import { PerkRail } from '../../../src/components/data-display/PerkRail';

import { render, screen } from '@testing-library/react';

describe('PerkRail', () => {
  it('renders descriptive perk copy instead of count-only messaging', () => {
    render(<PerkRail variant="minimal" logos={[<div key="google">G</div>]} label="Google Cloud Faucet" />);

    expect(screen.getByText('Google Cloud Faucet')).toBeTruthy();
  });

  it('renders the label without truncation', () => {
    const onPress = vi.fn();
    render(
      <PerkRail variant="minimal" logos={[<div key="google">G</div>]} label="Eligible for 2 perks" onPress={onPress} />,
    );

    const label = screen.getByText('Eligible for 2 perks');
    expect(label).toBeTruthy();
  });
});
