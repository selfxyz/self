// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/* @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';

import { PerkRail } from '../../../src/components/data-display/PerkRail';

import { fireEvent, render, screen } from '@testing-library/react';

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

  it('minimal variant renders only the first logo even when multiple are passed', () => {
    render(
      <PerkRail
        variant="minimal"
        logos={[<span key="google" data-testid="logo-google" />, <span key="usat" data-testid="logo-usat" />]}
        label="Eligible perks"
      />,
    );

    expect(screen.getByTestId('logo-google')).toBeTruthy();
    expect(screen.queryByTestId('logo-usat')).toBeNull();
  });

  it('dense variant renders multiple logos in the order given', () => {
    const { container } = render(
      <PerkRail
        variant="dense"
        logos={[<span key="google" data-testid="logo-google" />, <span key="usat" data-testid="logo-usat" />]}
        label="Eligible perks"
      />,
    );

    const logos = container.querySelectorAll('[data-testid^="logo-"]');
    expect(logos.length).toBe(2);
    expect(logos[0]!.getAttribute('data-testid')).toBe('logo-google');
    expect(logos[1]!.getAttribute('data-testid')).toBe('logo-usat');
  });

  it('dense variant caps logos at the max (3) and drops overflow', () => {
    const { container } = render(
      <PerkRail
        variant="dense"
        logos={[
          <span key="a" data-testid="logo-a" />,
          <span key="b" data-testid="logo-b" />,
          <span key="c" data-testid="logo-c" />,
          <span key="d" data-testid="logo-d" />,
        ]}
        label="Eligible perks"
      />,
    );

    expect(container.querySelectorAll('[data-testid^="logo-"]').length).toBe(3);
    expect(screen.queryByTestId('logo-d')).toBeNull();
  });

  it('fires onPress when the rail is tapped', () => {
    const onPress = vi.fn();
    const { container } = render(
      <PerkRail variant="dense" logos={[<span key="g" />]} label="Eligible perks" onPress={onPress} />,
    );

    const button = container.querySelector('button');
    expect(button).toBeTruthy();
    fireEvent.click(button!);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
