// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { IDDataScreen } from '../../../src/screens/home/IDDataScreen';

const { analytics, haptic, getPerkRecordsForIdType } = vi.hoisted(() => ({
  analytics: { trackEvent: vi.fn() },
  haptic: { trigger: vi.fn() },
  getPerkRecordsForIdType: vi.fn(() => [
    { id: 'google_usdt_faucet', label: 'Google USDT faucet' },
    { id: 'aave_boosted_rewards', label: 'Aave Boosted Rewards' },
  ]),
}));

vi.mock('../../../src/providers/SelfClientProvider', () => ({
  useSelfClient: () => ({ analytics, haptic }),
}));

vi.mock('@selfxyz/mobile-sdk-alpha/browser', () => ({
  getPerkRecordsForIdType,
}));

describe('IDDataScreen perks card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders eligible perks and tracks viewed once on mount', () => {
    render(
      <MemoryRouter>
        <IDDataScreen />
      </MemoryRouter>,
    );

    expect(screen.getByText('Eligible perks')).toBeTruthy();
    expect(analytics.trackEvent).toHaveBeenCalledWith('id_data_perks_viewed', {
      id_type: 'p',
      perk_count: 2,
      perk_ids: ['google_usdt_faucet', 'aave_boosted_rewards'],
    });
    expect(analytics.trackEvent.mock.calls.filter(([eventName]) => eventName === 'id_data_perks_viewed')).toHaveLength(1);
  });

  it('tracks perk taps with perk id', () => {
    render(
      <MemoryRouter>
        <IDDataScreen />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /google usdt faucet/i })[0]);

    expect(analytics.trackEvent).toHaveBeenCalledWith('id_data_perk_tapped', {
      id_type: 'p',
      perk_id: 'google_usdt_faucet',
    });
  });

  it('omits perks card when no perks are eligible', () => {
    getPerkRecordsForIdType.mockReturnValueOnce([]);

    render(
      <MemoryRouter>
        <IDDataScreen />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Eligible perks')).toBeNull();
  });
});
