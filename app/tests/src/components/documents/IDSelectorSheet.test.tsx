// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import type { IDSelectorDocument } from '@/components/documents';
import { IDSelectorItem, IDSelectorSheet } from '@/components/documents';

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  useSelfClient: jest.fn(),
}));

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

const mockUseSelfClient = useSelfClient as jest.MockedFunction<
  typeof useSelfClient
>;
const mockTrackEvent = jest.fn();

const makeGooglePerk = () => ({
  id: 'google_cloud_faucet' as const,
  label: 'Google Cloud Faucet',
  renderLogos: () => [
    <Text key="g" testID="logo-g">
      g
    </Text>,
  ],
});

const renderedText = (tree: ReturnType<typeof render>) =>
  JSON.stringify(tree.toJSON());

describe('IDSelectorItem', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with testID and exposes the document name', () => {
    const tree = render(
      <IDSelectorItem
        documentName="EU ID"
        state="active"
        onPress={mockOnPress}
        nationalityCode="DEU"
        securityLabel="HI-SECURITY"
        testID="test-item"
      />,
    );

    expect(tree.getByTestId('test-item')).toBeTruthy();
    expect(renderedText(tree)).toContain('EU ID');
  });

  it('calls onPress when pressed on active state', () => {
    const { getByTestId } = render(
      <IDSelectorItem
        documentName="EU ID"
        state="active"
        onPress={mockOnPress}
        nationalityCode="DEU"
        testID="test-item"
      />,
    );

    fireEvent.press(getByTestId('test-item'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('calls onPress when pressed on verified state', () => {
    const { getByTestId } = render(
      <IDSelectorItem
        documentName="FRA Passport"
        state="verified"
        onPress={mockOnPress}
        nationalityCode="FRA"
        testID="test-item"
      />,
    );

    fireEvent.press(getByTestId('test-item'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders all states without throwing', () => {
    const states: Array<'active' | 'verified' | 'expired' | 'mock'> = [
      'active',
      'verified',
      'expired',
      'mock',
    ];
    for (const state of states) {
      const { getByTestId, unmount } = render(
        <IDSelectorItem
          documentName="Doc"
          state={state}
          onPress={mockOnPress}
          isMock={state === 'mock'}
          nationalityCode={state === 'mock' ? undefined : 'USA'}
          securityLabel={state === 'expired' ? undefined : 'HI-SECURITY'}
          testID="test-item"
        />,
      );
      expect(getByTestId('test-item')).toBeTruthy();
      unmount();
    }
  });

  it('renders the HI-SECURITY pill when securityLabel is provided', () => {
    const tree = render(
      <IDSelectorItem
        documentName="US Passport"
        state="verified"
        nationalityCode="USA"
        securityLabel="HI-SECURITY"
        onPress={mockOnPress}
        testID="test-item"
      />,
    );
    expect(renderedText(tree)).toContain('HI-SECURITY');
  });

  it('omits the security pill when securityLabel is undefined', () => {
    const tree = render(
      <IDSelectorItem
        documentName="Verified ID"
        state="verified"
        onPress={mockOnPress}
        testID="test-item"
      />,
    );
    expect(renderedText(tree)).not.toContain('HI-SECURITY');
  });

  it('renders the DevCardLogo for mocks instead of a flag', () => {
    const tree = render(
      <IDSelectorItem
        documentName="Dev Passport"
        state="mock"
        isMock
        onPress={mockOnPress}
        testID="test-item"
      />,
    );
    // The mocked RoundFlag emits its country code attribute; with isMock=true
    // we should not render it at all.
    expect(renderedText(tree)).not.toContain('mock-round-flag');
  });

  it('renders RoundFlag for non-mock docs and forwards the nationality code', () => {
    const tree = render(
      <IDSelectorItem
        documentName="FRA Passport"
        state="verified"
        nationalityCode="FRA"
        onPress={mockOnPress}
        testID="test-item"
      />,
    );
    expect(renderedText(tree)).toContain('mock-round-flag');
    expect(renderedText(tree)).toContain('FRA');
  });

  it('renders a neutral fallback icon when nationality code is missing', () => {
    const tree = render(
      <IDSelectorItem
        documentName="Unknown Passport"
        state="verified"
        onPress={mockOnPress}
        testID="test-item"
      />,
    );
    expect(renderedText(tree)).toContain('icon-circle-help');
    expect(renderedText(tree)).not.toContain('mock-round-flag');
  });

  it('preserves the underlying state subtitle when flagged ineligible', () => {
    const onIneligiblePress = jest.fn();

    const mockTree = render(
      <IDSelectorItem
        documentName="Dev USA Passport"
        state="mock"
        ineligible
        isMock
        onPress={mockOnPress}
        onIneligiblePress={onIneligiblePress}
        testID="test-item"
      />,
    ).toJSON();
    const mockJson = JSON.stringify(mockTree);
    expect(mockJson).toContain('Testing document');
    expect(mockJson).not.toContain('Verified ID');

    const verifiedTree = render(
      <IDSelectorItem
        documentName="US Passport"
        state="verified"
        ineligible
        nationalityCode="USA"
        onPress={mockOnPress}
        onIneligiblePress={onIneligiblePress}
        testID="test-item"
      />,
    ).toJSON();
    expect(JSON.stringify(verifiedTree)).toContain('Verified ID');
  });

  it('routes presses to onIneligiblePress (and not onPress) when ineligible', () => {
    const onIneligiblePress = jest.fn();
    const { getByTestId } = render(
      <IDSelectorItem
        documentName="Aadhaar"
        state="verified"
        ineligible
        onPress={mockOnPress}
        onIneligiblePress={onIneligiblePress}
        testID="test-item"
      />,
    );
    fireEvent.press(getByTestId('test-item'));
    expect(onIneligiblePress).toHaveBeenCalledTimes(1);
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('renders expired rows as disabled pressables', () => {
    const onIneligiblePress = jest.fn();
    const { getByTestId } = render(
      <IDSelectorItem
        documentName="Expired Passport"
        state="expired"
        onPress={mockOnPress}
        onIneligiblePress={onIneligiblePress}
        testID="test-item"
      />,
    );
    expect(getByTestId('test-item').props.disabled).toBe(true);
  });
});

describe('IDSelectorSheet', () => {
  const mockDocuments: IDSelectorDocument[] = [
    {
      id: 'doc1',
      name: 'EU ID',
      state: 'verified',
      nationalityCode: 'DEU',
      securityLabel: 'HI-SECURITY',
    },
    {
      id: 'doc2',
      name: 'FRA Passport',
      state: 'verified',
      nationalityCode: 'FRA',
      securityLabel: 'HI-SECURITY',
    },
    {
      id: 'doc3',
      name: 'Dev USA Passport',
      state: 'mock',
      isMock: true,
    },
    { id: 'doc4', name: 'Aadhaar ID', state: 'expired', isMock: false },
  ];

  const mockOnOpenChange = jest.fn();
  const mockOnSelect = jest.fn();
  const mockOnDismiss = jest.fn();
  const mockOnApprove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelfClient.mockReturnValue({ trackEvent: mockTrackEvent } as any);
  });

  it('renders document items with testIDs', () => {
    const { getByTestId } = render(
      <IDSelectorSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        documents={mockDocuments}
        selectedId="doc1"
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        testID="sheet"
      />,
    );

    expect(getByTestId('sheet-item-doc1')).toBeTruthy();
    expect(getByTestId('sheet-item-doc2')).toBeTruthy();
    expect(getByTestId('sheet-item-doc3')).toBeTruthy();
    expect(getByTestId('sheet-item-doc4')).toBeTruthy();
  });

  it('still selects the active row item by id', () => {
    const { getByTestId } = render(
      <IDSelectorSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        documents={mockDocuments}
        selectedId="doc1"
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        testID="sheet"
      />,
    );

    expect(getByTestId('sheet-item-doc1')).toBeTruthy();
  });

  it('calls onSelect when a document item is pressed', () => {
    const { getByTestId } = render(
      <IDSelectorSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        documents={mockDocuments}
        selectedId="doc1"
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        testID="sheet"
      />,
    );

    fireEvent.press(getByTestId('sheet-item-doc2'));
    expect(mockOnSelect).toHaveBeenCalledWith('doc2');
  });

  it('renders empty list without document items', () => {
    const { queryByTestId } = render(
      <IDSelectorSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        documents={[]}
        selectedId={undefined}
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        testID="sheet"
      />,
    );

    expect(queryByTestId('sheet-item-doc1')).toBeNull();
    expect(queryByTestId('sheet-item-doc2')).toBeNull();
  });

  it('exposes the new Approve + Dismiss pill buttons', () => {
    const { getByTestId } = render(
      <IDSelectorSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        documents={mockDocuments}
        selectedId="doc1"
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        testID="sheet"
      />,
    );

    expect(getByTestId('sheet-select-button')).toBeTruthy();
    expect(getByTestId('sheet-dismiss-button')).toBeTruthy();
  });

  it('fires onApprove when the select button is tapped and approvable', () => {
    const { getByTestId } = render(
      <IDSelectorSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        documents={mockDocuments}
        selectedId="doc1"
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        testID="sheet"
      />,
    );

    fireEvent.press(getByTestId('sheet-select-button'));
    expect(mockOnApprove).toHaveBeenCalledTimes(1);
  });

  it('marks the select button as disabled when the selection is expired', () => {
    const { getByTestId } = render(
      <IDSelectorSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        documents={mockDocuments}
        selectedId="doc4"
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        testID="sheet"
      />,
    );

    expect(getByTestId('sheet-select-button').props.disabled).toBe(true);
  });

  it('calls onDismiss when dismiss is pressed', () => {
    const { getByTestId } = render(
      <IDSelectorSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        documents={mockDocuments}
        selectedId="doc1"
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        testID="sheet"
      />,
    );

    fireEvent.press(getByTestId('sheet-dismiss-button'));
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders no perk row when no activePerkId is supplied', () => {
    const tree = render(
      <IDSelectorSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        documents={mockDocuments}
        selectedId="doc1"
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        testID="sheet"
      />,
    );
    expect(JSON.stringify(tree.toJSON())).not.toContain('Eligible for');
  });
});

describe('IDSelectorSheet — perk eligibility', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnSelect = jest.fn();
  const mockOnDismiss = jest.fn();
  const mockOnApprove = jest.fn();

  const documents: IDSelectorDocument[] = [
    {
      id: 'doc1',
      name: 'US Passport',
      state: 'verified',
      idType: 'passport',
      nationalityCode: 'USA',
      securityLabel: 'HI-SECURITY',
    },
    {
      id: 'doc2',
      name: 'Aadhaar',
      state: 'verified',
      idType: 'aadhaar',
      nationalityCode: 'IND',
      securityLabel: 'LOW-SECURITY',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelfClient.mockReturnValue({ trackEvent: mockTrackEvent } as any);
  });

  it('renders the perk row when activePerkId is set + active doc is eligible', () => {
    const tree = render(
      <IDSelectorSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        documents={documents}
        selectedId="doc1"
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        activePerkId="google_cloud_faucet"
        perksByDocumentId={{ doc1: [makeGooglePerk()] }}
        ineligibleReasonByDocumentId={{ doc2: 'needs_nfc' }}
        testID="sheet"
      />,
    );
    expect(JSON.stringify(tree.toJSON())).toContain('Eligible for 1 perk');
  });

  it('renders the perk row on an eligible doc even when it is not the active selection', () => {
    const tree = render(
      <IDSelectorSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        documents={documents}
        selectedId="doc2"
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        activePerkId="google_cloud_faucet"
        perksByDocumentId={{ doc1: [makeGooglePerk()] }}
        ineligibleReasonByDocumentId={{ doc2: 'needs_nfc' }}
        testID="sheet"
      />,
    );
    expect(tree.getByTestId('sheet-item-doc1-perks')).toBeTruthy();
  });

  it('does not render the perk row on an ineligible doc even with perks defined', () => {
    const tree = render(
      <IDSelectorSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        documents={documents}
        selectedId="doc1"
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        activePerkId="google_cloud_faucet"
        perksByDocumentId={{
          doc1: [makeGooglePerk()],
          doc2: [makeGooglePerk()],
        }}
        ineligibleReasonByDocumentId={{ doc2: 'needs_nfc' }}
        testID="sheet"
      />,
    );
    expect(tree.queryByTestId('sheet-item-doc2-perks')).toBeNull();
    expect(tree.getByTestId('sheet-item-doc1-perks')).toBeTruthy();
  });

  it('does not render the perk row when ineligible-doc is the active selection', () => {
    const tree = render(
      <IDSelectorSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        documents={documents}
        selectedId="doc2"
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        activePerkId="google_cloud_faucet"
        perksByDocumentId={{}}
        ineligibleReasonByDocumentId={{ doc2: 'needs_nfc' }}
        testID="sheet"
      />,
    );
    expect(JSON.stringify(tree.toJSON())).not.toContain('Eligible for');
  });

  it('fires _viewed exactly once per open with eligible/ineligible counts', () => {
    const { rerender } = render(
      <IDSelectorSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        documents={documents}
        selectedId="doc1"
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        activePerkId="google_cloud_faucet"
        perksByDocumentId={{ doc1: [makeGooglePerk()] }}
        ineligibleReasonByDocumentId={{ doc2: 'needs_nfc' }}
        testID="sheet"
      />,
    );

    const viewedCalls = mockTrackEvent.mock.calls.filter(
      ([name]) => name === 'proof_request_picker_viewed',
    );
    expect(viewedCalls).toHaveLength(1);
    expect(viewedCalls[0][1]).toEqual({
      perk_id: 'google_cloud_faucet',
      eligible_count: 1,
      ineligible_count: 1,
    });

    rerender(
      <IDSelectorSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        documents={documents}
        selectedId="doc1"
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        activePerkId="google_cloud_faucet"
        perksByDocumentId={{ doc1: [makeGooglePerk()] }}
        ineligibleReasonByDocumentId={{ doc2: 'needs_nfc' }}
        testID="sheet"
      />,
    );
    expect(
      mockTrackEvent.mock.calls.filter(
        ([name]) => name === 'proof_request_picker_viewed',
      ),
    ).toHaveLength(1);
  });

  it('refires _viewed after the sheet is closed and reopened', () => {
    const { rerender } = render(
      <IDSelectorSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        documents={documents}
        selectedId="doc1"
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        activePerkId="google_cloud_faucet"
        ineligibleReasonByDocumentId={{ doc2: 'needs_nfc' }}
        testID="sheet"
      />,
    );

    // Close
    rerender(
      <IDSelectorSheet
        open={false}
        onOpenChange={mockOnOpenChange}
        documents={documents}
        selectedId="doc1"
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        activePerkId="google_cloud_faucet"
        ineligibleReasonByDocumentId={{ doc2: 'needs_nfc' }}
        testID="sheet"
      />,
    );
    // Reopen
    rerender(
      <IDSelectorSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        documents={documents}
        selectedId="doc1"
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        activePerkId="google_cloud_faucet"
        ineligibleReasonByDocumentId={{ doc2: 'needs_nfc' }}
        testID="sheet"
      />,
    );

    const viewedCalls = mockTrackEvent.mock.calls.filter(
      ([name]) => name === 'proof_request_picker_viewed',
    );
    expect(viewedCalls).toHaveLength(2);
  });

  it('does not fire _viewed when activePerkId is undefined', () => {
    render(
      <IDSelectorSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        documents={documents}
        selectedId="doc1"
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        testID="sheet"
      />,
    );
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('fires _id_selected with was_eligible=true for eligible row', () => {
    const { getByTestId } = render(
      <IDSelectorSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        documents={documents}
        selectedId="doc1"
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        activePerkId="google_cloud_faucet"
        perksByDocumentId={{ doc1: [makeGooglePerk()] }}
        ineligibleReasonByDocumentId={{ doc2: 'needs_nfc' }}
        testID="sheet"
      />,
    );

    fireEvent.press(getByTestId('sheet-item-doc1'));
    expect(mockOnSelect).toHaveBeenCalledWith('doc1');
    const selected = mockTrackEvent.mock.calls.find(
      ([name]) => name === 'proof_request_id_selected',
    );
    expect(selected?.[1]).toEqual({
      id_type: 'passport',
      perk_id: 'google_cloud_faucet',
      was_eligible: true,
    });
  });

  it('blocks selection on ineligible row and fires _ineligible_id_tapped', () => {
    const { getByTestId } = render(
      <IDSelectorSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        documents={documents}
        selectedId="doc1"
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        activePerkId="google_cloud_faucet"
        perksByDocumentId={{ doc1: [makeGooglePerk()] }}
        ineligibleReasonByDocumentId={{ doc2: 'needs_nfc' }}
        testID="sheet"
      />,
    );

    fireEvent.press(getByTestId('sheet-item-doc2'));
    expect(mockOnSelect).not.toHaveBeenCalled();

    const tapped = mockTrackEvent.mock.calls.find(
      ([name]) => name === 'proof_request_ineligible_id_tapped',
    );
    expect(tapped?.[1]).toEqual({
      id_type: 'aadhaar',
      perk_id: 'google_cloud_faucet',
      reason: 'needs_nfc',
    });
  });

  it('disables Approve when the active selection is ineligible', () => {
    const { getByTestId } = render(
      <IDSelectorSheet
        open={true}
        onOpenChange={mockOnOpenChange}
        documents={documents}
        selectedId="doc2"
        onSelect={mockOnSelect}
        onDismiss={mockOnDismiss}
        onApprove={mockOnApprove}
        activePerkId="google_cloud_faucet"
        ineligibleReasonByDocumentId={{ doc2: 'needs_nfc' }}
        testID="sheet"
      />,
    );

    expect(getByTestId('sheet-select-button').props.disabled).toBe(true);
  });
});
