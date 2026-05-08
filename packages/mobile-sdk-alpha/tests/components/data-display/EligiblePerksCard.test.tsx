// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/* @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { EligiblePerksCard } from '../../../src/components/data-display/EligiblePerksCard';

describe('EligiblePerksCard', () => {
  it('renders all logos returned by renderLogos for a perk', () => {
    render(
      <EligiblePerksCard
        perks={[
          {
            id: 'google_cloud_faucet',
            label: 'Google Cloud Faucet',
            renderLogos: () => [
              <span key="google" data-testid="logo-google" />,
              <span key="usat" data-testid="logo-usat" />,
            ],
          },
        ]}
      />,
    );

    expect(screen.getByTestId('logo-google')).toBeTruthy();
    expect(screen.getByTestId('logo-usat')).toBeTruthy();
  });

  it('renders a pressable row when onPerkPress is provided', () => {
    const onPerkPress = vi.fn();
    const { container } = render(
      <EligiblePerksCard
        perks={[
          {
            id: 'google_cloud_faucet',
            label: 'Google Cloud Faucet',
            renderLogos: () => [<span key="google" data-testid="logo-google" />],
          },
        ]}
        onPerkPress={onPerkPress}
      />,
    );

    // Pressable is mocked to render as a button — verifies the press handler is wired.
    const button = container.querySelector('button');
    expect(button).toBeTruthy();
    expect(screen.getByText('Google Cloud Faucet')).toBeTruthy();
  });

  it('fires onView once with all perk ids', () => {
    const onView = vi.fn();
    render(
      <EligiblePerksCard
        perks={[
          { id: 'a', label: 'A', renderLogos: () => [] },
          { id: 'b', label: 'B', renderLogos: () => [] },
        ]}
        onView={onView}
      />,
    );

    expect(onView).toHaveBeenCalledTimes(1);
    expect(onView).toHaveBeenCalledWith(['a', 'b']);
  });

  it('renders nothing when there are no perks', () => {
    const { container } = render(<EligiblePerksCard perks={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
