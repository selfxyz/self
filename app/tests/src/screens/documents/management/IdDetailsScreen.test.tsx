// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { usePassport } from '@/providers/passportDataProvider';
import IdDetailsScreen from '@/screens/documents/management/IdDetailsScreen';
import useUserStore from '@/stores/userStore';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'mock-button': any;
      'mock-stack': any;
      'mock-text': any;
      'mock-perks-card': any;
    }
  }
}

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ bottom: 0 })),
}));

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('tamagui', () => ({
  Button: ({ children, onPress, ...props }: any) => (
    <mock-button onPress={onPress} {...props}>
      {children}
    </mock-button>
  ),
  Text: ({ children, ...props }: any) => (
    <mock-text {...props}>{children}</mock-text>
  ),
  XStack: ({ children, ...props }: any) => (
    <mock-stack {...props}>{children}</mock-stack>
  ),
  YStack: ({ children, ...props }: any) => (
    <mock-stack {...props}>{children}</mock-stack>
  ),
  ZStack: ({ children, ...props }: any) => (
    <mock-stack {...props}>{children}</mock-stack>
  ),
}));

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  useSelfClient: jest.fn(),
  getPerkRecordsForIdType: jest.fn(),
  getEligiblePerksForIdType: jest.fn(),
}));

jest.mock('@selfxyz/mobile-sdk-alpha/components', () => ({
  EligiblePerksCard: ({ perks, onView, onPerkPress }: any) => (
    <mock-perks-card
      testID="perks-card"
      data-perks={perks.map((perk: any) => perk.id).join(',')}
      onView={onView}
      onPerkPress={onPerkPress}
    />
  ),
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/analytics', () => ({
  IDDataEvents: {
    PERKS_VIEWED: 'IDDataEvents.PERKS_VIEWED',
    PERK_TAPPED: 'IDDataEvents.PERK_TAPPED',
    PERK_OUTLINK_OPEN_FAILED: 'IDDataEvents.PERK_OUTLINK_OPEN_FAILED',
  },
}));

jest.mock('react-native', () => ({
  __esModule: true,
  Linking: { openURL: jest.fn(() => Promise.resolve()) },
  Platform: { OS: 'ios' },
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => style,
  },
}));

const mockLinking = jest.requireMock('react-native').Linking as jest.Mocked<{
  openURL: jest.Mock;
}>;

jest.mock('@selfxyz/mobile-sdk-alpha/constants/colors', () => ({
  black: '#000',
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate300: '#cbd5e1',
  slate500: '#64748b',
  white: '#fff',
}));

jest.mock('@/components/homescreen/IdCard', () => ({
  __esModule: true,
  default: () => <mock-stack testID="id-card" />,
}));

jest.mock('@/screens/home/ProofHistoryList', () => ({
  ProofHistoryList: ({
    ListHeaderComponent,
  }: {
    ListHeaderComponent?: React.ReactNode;
  }) => (
    <mock-stack testID="proof-history">
      {ListHeaderComponent ?? null}
    </mock-stack>
  ),
}));

jest.mock('@/providers/passportDataProvider', () => ({
  usePassport: jest.fn(),
}));

jest.mock('@/stores/userStore');

const { useNavigation } = jest.requireMock('@react-navigation/native') as {
  useNavigation: jest.Mock;
};
const { useSelfClient, getPerkRecordsForIdType, getEligiblePerksForIdType } =
  jest.requireMock('@selfxyz/mobile-sdk-alpha') as {
    useSelfClient: jest.Mock;
    getPerkRecordsForIdType: jest.Mock;
    getEligiblePerksForIdType: jest.Mock;
  };

const mockUsePassport = usePassport as jest.MockedFunction<typeof usePassport>;
const mockUseUserStore = useUserStore as unknown as jest.Mock;

const PASSPORT_PERKS = [
  { id: 'google_cloud_faucet', label: 'Google Cloud Faucet', isNew: true },
];

const PASSPORT_PERK_RECORDS = [
  {
    id: 'google_cloud_faucet',
    label: 'Google Cloud Faucet',
    isNew: true,
    outlinkUrl: 'https://self.xyz/blog/google-self',
  },
];

const passportDoc = {
  documentType: 'passport',
  documentCategory: 'passport',
};

describe('IdDetailsScreen', () => {
  const trackEvent = jest.fn();
  const loadDocumentCatalog = jest.fn();
  const getAllDocuments = jest.fn();
  const setSelectedDocument = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    useNavigation.mockReturnValue({ navigate: jest.fn() });
    useSelfClient.mockReturnValue({ trackEvent });
    mockUseUserStore.mockReturnValue({ idDetailsDocumentId: 'doc-1' });
    mockUsePassport.mockReturnValue({
      loadDocumentCatalog,
      getAllDocuments,
      setSelectedDocument,
    } as unknown as ReturnType<typeof usePassport>);

    loadDocumentCatalog.mockResolvedValue({
      documents: [],
      selectedDocumentId: 'doc-1',
    });
    getAllDocuments.mockResolvedValue({
      'doc-1': { data: passportDoc },
    });
    getPerkRecordsForIdType.mockReturnValue(PASSPORT_PERK_RECORDS);
    getEligiblePerksForIdType.mockReturnValue(PASSPORT_PERKS);
  });

  it('renders perks for an eligible document and fires the view analytics event', async () => {
    const { UNSAFE_root } = render(<IdDetailsScreen />);

    const card = await waitFor(() =>
      UNSAFE_root.findByType('mock-perks-card' as never),
    );

    expect(getPerkRecordsForIdType).toHaveBeenCalledWith('p');
    expect(card.props['data-perks']).toBe('google_cloud_faucet');

    card.props.onView(['google_cloud_faucet']);

    expect(trackEvent).toHaveBeenCalledWith('IDDataEvents.PERKS_VIEWED', {
      id_type: 'p',
      perk_count: 1,
      perk_ids: ['google_cloud_faucet'],
    });
  });

  it('opens the perk outlink URL and fires the perk-tapped analytics event', async () => {
    const { UNSAFE_root } = render(<IdDetailsScreen />);

    const card = await waitFor(() =>
      UNSAFE_root.findByType('mock-perks-card' as never),
    );

    await card.props.onPerkPress('google_cloud_faucet');

    expect(trackEvent).toHaveBeenCalledWith('IDDataEvents.PERK_TAPPED', {
      id_type: 'p',
      perk_id: 'google_cloud_faucet',
      has_outlink: true,
    });
    expect(mockLinking.openURL).toHaveBeenCalledWith(
      'https://self.xyz/blog/google-self',
    );
  });

  it('does not open a URL when the perk has no outlink URL', async () => {
    getPerkRecordsForIdType.mockReturnValue([
      { id: 'google_cloud_faucet', label: 'Google Cloud Faucet', isNew: true },
    ]);

    const { UNSAFE_root } = render(<IdDetailsScreen />);
    const card = await waitFor(() =>
      UNSAFE_root.findByType('mock-perks-card' as never),
    );

    await card.props.onPerkPress('google_cloud_faucet');

    expect(trackEvent).toHaveBeenCalledWith('IDDataEvents.PERK_TAPPED', {
      id_type: 'p',
      perk_id: 'google_cloud_faucet',
      has_outlink: false,
    });
    expect(mockLinking.openURL).not.toHaveBeenCalled();
  });

  it('fires the outlink-failed event when Linking rejects', async () => {
    mockLinking.openURL.mockRejectedValueOnce(new Error('no handler'));

    const { UNSAFE_root } = render(<IdDetailsScreen />);
    const card = await waitFor(() =>
      UNSAFE_root.findByType('mock-perks-card' as never),
    );

    await card.props.onPerkPress('google_cloud_faucet');

    expect(trackEvent).toHaveBeenCalledWith(
      'IDDataEvents.PERK_OUTLINK_OPEN_FAILED',
      { id_type: 'p', perk_id: 'google_cloud_faucet' },
    );
  });

  it('hides the perks card while ID data is being viewed', async () => {
    const { UNSAFE_root } = render(<IdDetailsScreen />);

    await waitFor(() => UNSAFE_root.findByType('mock-perks-card' as never));

    const viewIdButton = UNSAFE_root.findAllByType('mock-button' as never).find(
      node => node.props.children === 'View ID Data',
    );

    expect(viewIdButton).toBeTruthy();
    fireEvent(viewIdButton!, 'press');

    await waitFor(() => {
      expect(
        UNSAFE_root.findAllByType('mock-perks-card' as never),
      ).toHaveLength(0);
    });
  });

  it('hides the perks card for documents with no eligible perks', async () => {
    getAllDocuments.mockResolvedValue({
      'doc-1': { data: { documentType: 'kyc', documentCategory: 'kyc' } },
    });
    getPerkRecordsForIdType.mockReturnValue([]);
    getEligiblePerksForIdType.mockReturnValue([]);

    const { UNSAFE_root } = render(<IdDetailsScreen />);

    await waitFor(() => {
      expect(UNSAFE_root.findByType('mock-stack' as never)).toBeTruthy();
    });

    expect(UNSAFE_root.findAllByType('mock-perks-card' as never)).toHaveLength(
      0,
    );
  });

  it('hides the perks card for mock documents', async () => {
    getAllDocuments.mockResolvedValue({
      'doc-1': {
        data: {
          documentType: 'mock_passport',
          documentCategory: 'passport',
          mock: true,
        },
      },
    });

    const { UNSAFE_root } = render(<IdDetailsScreen />);

    await waitFor(() => {
      expect(UNSAFE_root.findByType('mock-stack' as never)).toBeTruthy();
    });

    expect(UNSAFE_root.findAllByType('mock-perks-card' as never)).toHaveLength(
      0,
    );
  });
});
