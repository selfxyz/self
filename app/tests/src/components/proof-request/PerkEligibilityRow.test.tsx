// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

import type { Perk } from '@selfxyz/mobile-sdk-alpha/onboarding/perks';

import { PerkEligibilityRow } from '@/components/proof-request/PerkEligibilityRow';

const makePerk = (id: string, label: string, logoKey: string): Perk => ({
  id: id as Perk['id'],
  label,
  renderLogos: () => [
    <Text key={logoKey} testID={`logo-${logoKey}`}>
      {logoKey}
    </Text>,
  ],
});

const renderedText = (tree: ReturnType<typeof render>) =>
  JSON.stringify(tree.toJSON());

describe('PerkEligibilityRow', () => {
  it('returns null when perks is empty', () => {
    const tree = render(<PerkEligibilityRow perks={[]} />);
    expect(renderedText(tree)).not.toMatch(/Eligible for/i);
  });

  it('returns null when no perk has a renderLogos', () => {
    const perks: Perk[] = [{ id: 'google_cloud_faucet', label: 'No logo' }];
    const tree = render(<PerkEligibilityRow perks={perks} />);
    expect(renderedText(tree)).not.toMatch(/Eligible for/i);
  });

  it('renders singular label for one perk', () => {
    const perks = [makePerk('google_cloud_faucet', 'Google Cloud Faucet', 'g')];
    const tree = render(<PerkEligibilityRow perks={perks} />);
    expect(renderedText(tree)).toContain('Eligible for 1 perk');
    expect(tree.getByTestId('logo-g')).toBeTruthy();
  });

  it('renders plural label and merges multi-perk logos in one row', () => {
    const perks = [
      makePerk('google_cloud_faucet', 'A', 'a'),
      makePerk('google_cloud_faucet', 'B', 'b'),
    ];
    const tree = render(<PerkEligibilityRow perks={perks} />);
    expect(renderedText(tree)).toContain('Eligible for 2 perks');
    expect(tree.getByTestId('logo-a')).toBeTruthy();
    expect(tree.getByTestId('logo-b')).toBeTruthy();
  });

  it('fans logos out side-by-side instead of stacking them in a single circle', () => {
    // Regression: the old implementation rendered every logo inside one 32x32
    // wrapper, so two perks visually overlapped. Each logo must own its
    // parent wrapper so the dense rail can place them side-by-side.
    const perks = [
      makePerk('google_cloud_faucet', 'A', 'a'),
      makePerk('google_cloud_faucet', 'B', 'b'),
    ];
    const tree = render(<PerkEligibilityRow perks={perks} />);
    const a = tree.getByTestId('logo-a');
    const b = tree.getByTestId('logo-b');
    expect(a.parent).not.toBe(b.parent);
  });

  it('keeps the attached row rounded but removes the bottom radius for inline rows', () => {
    const perks = [makePerk('google_cloud_faucet', 'A', 'a')];

    const inline = render(<PerkEligibilityRow perks={perks} variant="inline" testID="inline-row" />);
    const attached = render(
      <PerkEligibilityRow perks={perks} variant="attached" testID="attached-row" />,
    );

    expect(inline.getByTestId('inline-row').props.style).toEqual(
      expect.objectContaining({
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      }),
    );
    expect(attached.getByTestId('attached-row').props.style).toBeUndefined();
  });
});
