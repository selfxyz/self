// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/* @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';

import { PerkRail } from '../../../src/components/data-display/PerkRail';

import { render, screen } from '@testing-library/react';

describe('PerkRail', () => {
  it('renders descriptive perk copy instead of count-only messaging', () => {
    render(<PerkRail variant="minimal" logos={[<div key="google">G</div>]} label="Google USDT faucet" />);

    expect(screen.getByText('Google USDT faucet')).toBeTruthy();
  });

  it('keeps long labels constrained inside the pill', () => {
    const onPress = vi.fn();
    render(
      <PerkRail
        variant="minimal"
        logos={[<div key="google">G</div>]}
        label="Google USDT faucet +1 more"
        onPress={onPress}
      />,
    );

    const label = screen.getByText('Google USDT faucet +1 more');
    const pill = label.parentElement as HTMLDivElement | null;

    expect(pill).toBeTruthy();
    expect(pill?.style.maxWidth).toBe('78%');
  });
});
