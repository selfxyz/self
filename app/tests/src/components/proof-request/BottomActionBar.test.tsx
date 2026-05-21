// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import type { Perk } from '@selfxyz/mobile-sdk-alpha/onboarding/perks';

import { BottomActionBar } from '@/components/proof-request/BottomActionBar';

jest.mock('@selfxyz/mobile-sdk-alpha/components', () => ({
  __esModule: true,
  RoundFlag: ({ countryCode }: { countryCode: string }) => (
    <mock-round-flag data-country-code={countryCode || 'none'} />
  ),
  PerkRail: ({
    logos = [],
    label,
    variant,
    testID,
  }: {
    logos?: React.ReactNode[];
    label?: string;
    variant?: string;
    testID?: string;
  }) => {
    const visible =
      variant === 'minimal' ? logos.slice(0, 1) : logos.slice(0, 3);
    return (
      <mock-perk-rail testID={testID} variant={variant}>
        {visible.map((logo, i) => (
          <mock-perk-rail-logo key={i}>{logo}</mock-perk-rail-logo>
        ))}
        <mock-perk-rail-label>{label}</mock-perk-rail-label>
      </mock-perk-rail>
    );
  },
}));

jest.mock('@/assets/images/dev_card_logo.svg', () => 'DevLogo');

const makePerk = (logoKey = 'g'): Perk => ({
  id: 'google_cloud_faucet' as const,
  label: 'Google Cloud Faucet',
  renderLogos: () => [
    <Text key={logoKey} testID={`logo-${logoKey}`}>
      {logoKey}
    </Text>,
  ],
});

const renderedText = (tree: ReturnType<typeof render>) =>
  JSON.stringify(tree.toJSON());

describe('BottomActionBar', () => {
  const baseProps = {
    selectedDocumentName: 'US Passport',
    selectedDocumentNationalityCode: 'USA',
    selectedDocumentIsMock: false,
    selectedDocumentSecurityLabel: 'HI-SECURITY',
    onDocumentSelectorPress: jest.fn(),
    onApprovePress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    baseProps.onDocumentSelectorPress = jest.fn();
    baseProps.onApprovePress = jest.fn();
  });

  it('renders the document selector and approve button stacked', () => {
    const { getByTestId } = render(
      <BottomActionBar {...baseProps} testID="bar" />,
    );
    expect(getByTestId('bar-document-selector')).toBeTruthy();
    expect(getByTestId('bar-approve')).toBeTruthy();
  });

  it('renders the document name and HI-SECURITY label', () => {
    const tree = render(<BottomActionBar {...baseProps} testID="bar" />);
    expect(renderedText(tree)).toContain('US Passport');
    expect(renderedText(tree)).toContain('HI-SECURITY');
  });

  it('renders the country flag for real documents', () => {
    const tree = render(<BottomActionBar {...baseProps} testID="bar" />);
    expect(renderedText(tree)).toContain('mock-round-flag');
    expect(renderedText(tree)).toContain('USA');
  });

  it('renders the DevCardLogo for mock documents instead of a flag', () => {
    const tree = render(
      <BottomActionBar
        {...baseProps}
        selectedDocumentIsMock={true}
        selectedDocumentNationalityCode={undefined}
        testID="bar"
      />,
    );
    expect(renderedText(tree)).not.toContain('mock-round-flag');
  });

  it('fires onDocumentSelectorPress when selector is tapped', () => {
    const { getByTestId } = render(
      <BottomActionBar {...baseProps} testID="bar" />,
    );
    fireEvent.press(getByTestId('bar-document-selector'));
    expect(baseProps.onDocumentSelectorPress).toHaveBeenCalledTimes(1);
  });

  it('fires onApprovePress when approve is tapped and enabled', () => {
    const { getByTestId } = render(
      <BottomActionBar {...baseProps} testID="bar" />,
    );
    fireEvent.press(getByTestId('bar-approve'));
    expect(baseProps.onApprovePress).toHaveBeenCalledTimes(1);
  });

  it('marks approve as disabled when approveDisabled is true', () => {
    const { getByTestId } = render(
      <BottomActionBar {...baseProps} approveDisabled testID="bar" />,
    );
    expect(getByTestId('bar-approve').props.disabled).toBe(true);
  });

  it('marks approve as disabled while approving', () => {
    const { getByTestId } = render(
      <BottomActionBar {...baseProps} approving testID="bar" />,
    );
    expect(getByTestId('bar-approve').props.disabled).toBe(true);
  });

  it('does not render the perk row when perks is empty/undefined', () => {
    const tree = render(<BottomActionBar {...baseProps} testID="bar" />);
    expect(renderedText(tree)).not.toContain('Eligible for');
  });

  it('renders the attached perk row when perks are provided', () => {
    const tree = render(
      <BottomActionBar {...baseProps} perks={[makePerk('g')]} testID="bar" />,
    );
    expect(renderedText(tree)).toContain('Eligible for 1 perk');
  });

  describe('ineligible state', () => {
    it('replaces the security label with an INELIGIBLE pill', () => {
      const tree = render(
        <BottomActionBar
          {...baseProps}
          selectedDocumentSecurityLabel="LOW-SECURITY"
          approveDisabled
          ineligible
          ineligibleReasonLabel="Needs an NFC-enabled passport."
          testID="bar"
        />,
      );
      expect(tree.queryByTestId('bar-document-selector-security')).toBeNull();
      const text = renderedText(tree);
      expect(text).toContain('Ineligible');
      expect(text).not.toContain('LOW-SECURITY');
    });

    it('renders the helper row with the reason copy when ineligible', () => {
      const tree = render(
        <BottomActionBar
          {...baseProps}
          approveDisabled
          ineligible
          ineligibleReasonLabel="Needs an NFC-enabled passport."
          testID="bar"
        />,
      );
      expect(tree.getByTestId('bar-ineligible-helper')).toBeTruthy();
      expect(renderedText(tree)).toContain('Needs an NFC-enabled passport.');
      expect(renderedText(tree)).toContain('Change ID');
    });

    it('falls back to generic helper copy when reason label is missing', () => {
      const tree = render(
        <BottomActionBar
          {...baseProps}
          approveDisabled
          ineligible
          testID="bar"
        />,
      );
      expect(renderedText(tree)).toContain(
        "This ID isn't eligible for this perk.",
      );
    });

    it('opens the picker when the helper row is tapped', () => {
      const { getByTestId } = render(
        <BottomActionBar
          {...baseProps}
          approveDisabled
          ineligible
          ineligibleReasonLabel="Needs an NFC-enabled passport."
          testID="bar"
        />,
      );
      fireEvent.press(getByTestId('bar-ineligible-helper'));
      expect(baseProps.onDocumentSelectorPress).toHaveBeenCalledTimes(1);
    });

    it('does not render the helper row when not ineligible', () => {
      const { queryByTestId } = render(
        <BottomActionBar {...baseProps} testID="bar" />,
      );
      expect(queryByTestId('bar-ineligible-helper')).toBeNull();
      expect(queryByTestId('bar-document-selector-ineligible')).toBeNull();
    });

    it('hides the helper row while approving even if ineligible', () => {
      const { queryByTestId } = render(
        <BottomActionBar
          {...baseProps}
          approveDisabled
          ineligible
          approving
          testID="bar"
        />,
      );
      expect(queryByTestId('bar-ineligible-helper')).toBeNull();
    });
  });
});
