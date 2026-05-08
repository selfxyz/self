// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/* @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';

import { EligiblePerksCard } from '../../../src/components/data-display/EligiblePerksCard';

import { fireEvent, render, screen } from '@testing-library/react';

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

  it('invokes onPerkPress with the perk id when the row is pressed', () => {
    const onPerkPress = vi.fn();
    const { container } = render(
      <EligiblePerksCard
        perks={[
          {
            id: 'google_cloud_faucet',
            label: 'Google Cloud Faucet',
            renderLogos: () => [<span key="google" data-testid="logo-google" />],
          },
          {
            id: 'usat',
            label: 'USAT',
            renderLogos: () => [<span key="usat" data-testid="logo-usat" />],
          },
        ]}
        onPerkPress={onPerkPress}
      />,
    );

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    fireEvent.click(buttons[1]!);
    expect(onPerkPress).toHaveBeenCalledTimes(1);
    expect(onPerkPress).toHaveBeenCalledWith('usat');
  });

  it('does not render a pressable row when onPerkPress is omitted', () => {
    const { container } = render(
      <EligiblePerksCard
        perks={[
          {
            id: 'google_cloud_faucet',
            label: 'Google Cloud Faucet',
            renderLogos: () => [<span key="google" />],
          },
        ]}
      />,
    );

    expect(container.querySelector('button')).toBeNull();
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
