// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { act, render } from '@testing-library/react-native';

import IdCardLayout from '@/components/homescreen/IdCard';

const MockOpenURL = jest.fn();
const MockTrackEvent = jest.fn();
const MockGetPerkRecordsForIdType = jest.fn((idType: string) =>
  idType === 'none'
    ? []
    : [
        {
          id: 'google_cloud_faucet',
          label: 'Google Cloud Faucet',
          isNew: true,
          outlinkUrl: 'https://example.test/perk',
        },
      ],
);
let MockPerkRailProps: {
  onPress?: () => void;
  logos?: unknown[];
  variant?: string;
} = {};

function perkRailRendered(): boolean {
  return Object.keys(MockPerkRailProps).length > 0;
}

jest.mock('react-native', () => ({
  __esModule: true,
  Image: ({ ...props }: any) => <mock-image {...props} />,
  Linking: { openURL: (...args: any[]) => MockOpenURL(...args) },
  Platform: { OS: 'ios', select: jest.fn() },
  Pressable: ({ children, onPress, ...props }: any) => (
    <mock-pressable {...props} onClick={onPress}>
      {children}
    </mock-pressable>
  ),
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (style: any) => style,
  },
}));

jest.mock('react-native-linear-gradient', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => (
    <mock-linear-gradient {...props}>{children}</mock-linear-gradient>
  ),
}));

jest.mock('tamagui', () => {
  const Pass = ({ children, ...props }: any) => (
    <div {...props}>{children}</div>
  );
  return {
    __esModule: true,
    Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    XStack: Pass,
    YStack: Pass,
  };
});

jest.mock('@react-navigation/native', () => ({
  __esModule: true,
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@selfxyz/euclid/dist/components/icons/WarningTriangleIcon', () => ({
  __esModule: true,
  WarningTriangleIcon: () => <mock-warning-icon />,
}));

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  __esModule: true,
  useSelfClient: () => ({ trackEvent: MockTrackEvent }),
  getPerkRecordsForIdType: (idType: string) =>
    MockGetPerkRecordsForIdType(idType),
}));

jest.mock('@selfxyz/mobile-sdk-alpha/components', () => ({
  __esModule: true,
  PerkRail: (props: any) => {
    MockPerkRailProps = props;
    return <mock-perk-rail />;
  },
  RoundFlag: () => <mock-round-flag />,
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/analytics', () => ({
  __esModule: true,
  HomescreenEvents: {
    ID_CARD_VIEWED: 'Homescreen: ID Card Viewed',
    ID_CARD_PERK_TAPPED: 'Homescreen: ID Card Perk Tapped',
    ID_CARD_PERK_OUTLINK_OPEN_FAILED:
      'Homescreen: ID Card Perk Outlink Open Failed',
  },
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/colors', () => ({
  __esModule: true,
  black: '#000',
  red600: '#dc2626',
  white: '#fff',
  yellow500: '#eab308',
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/fonts', () => ({
  __esModule: true,
  dinot: 'DINOT',
}));

jest.mock(
  '@selfxyz/mobile-sdk-alpha/svgs/icons/google.svg',
  () => 'GoogleLogo',
);

jest.mock('@selfxyz/common/utils/types', () => ({
  __esModule: true,
  isAadhaarDocument: (d: any) => d?.documentCategory === 'aadhaar',
  isKycDocument: (d: any) => d?.documentCategory === 'kyc',
  isMRZDocument: (d: any) =>
    d?.documentCategory === 'passport' || d?.documentCategory === 'id_card',
}));

jest.mock('@/assets/images/card_background_id1.png', () => 'bg1');
jest.mock('@/assets/images/card_background_id2.png', () => 'bg2');
jest.mock('@/assets/images/card_background_id3.png', () => 'bg3');
jest.mock('@/assets/images/card_background_id4.png', () => 'bg4');
jest.mock('@/assets/images/card_background_id5.png', () => 'bg5');
jest.mock('@/assets/images/card_background_id6.png', () => 'bg6');
jest.mock('@/assets/images/dev_card_logo.svg', () => 'DevLogo');
jest.mock('@/assets/images/dev_card_wave.svg', () => 'DevWave');
jest.mock('@/assets/images/self_logo_pending.svg', () => 'SelfPending');
jest.mock('@/assets/images/wave_overlay.png', () => 'WaveOverlay');

jest.mock('@/components/homescreen/CardBottomContent', () => ({
  __esModule: true,
  default: () => <mock-card-bottom />,
}));
jest.mock('@/components/homescreen/CardHeader', () => ({
  __esModule: true,
  default: () => <mock-card-header />,
}));
jest.mock('@/components/homescreen/IdCardRevealed', () => ({
  __esModule: true,
  default: () => <mock-id-card-revealed />,
}));
jest.mock('@/components/homescreen/KycIdCard', () => ({
  __esModule: true,
  default: () => <mock-kyc-id-card />,
}));
jest.mock('@/components/homescreen/cardSecurityBadge', () => ({
  __esModule: true,
  getSecurityBadgeLabel: () => 'HI-SECURITY',
}));

jest.mock('@/hooks/useCardDimensions', () => ({
  __esModule: true,
  useCardDimensions: () => ({
    cardWidth: 300,
    cardHeight: 200,
    borderRadius: 10,
    scale: 1,
    headerHeight: 60,
    figmaPadding: 12,
    logoSize: 32,
    headerGap: 8,
    expandedAspectRatio: 1.5,
    collapsedAspectRatio: 5,
    fontSize: {
      header: 18,
      subtitle: 7,
      badge: 10,
      bottomLabel: 15,
      bottomId: 10,
      button: 16,
    },
  }),
}));

jest.mock('@/utils/cardBackgroundSelector', () => ({
  __esModule: true,
  getBackgroundIndex: () => 1,
}));
jest.mock('@/utils/countryDemonyms', () => ({
  __esModule: true,
  getCountryDemonym: () => 'AMERICAN',
}));
jest.mock('@/utils/documentAttributes', () => ({
  __esModule: true,
  getDocumentAttributes: () => ({ nationalitySlice: 'USA' }),
}));
jest.mock('@/utils/modalCallbackRegistry', () => ({
  __esModule: true,
  registerModalCallbacks: () => 'cb-id',
}));

const passportDoc = {
  documentCategory: 'passport' as const,
  mrz: 'P<USA',
  mock: false,
} as any;

const secondPassportDoc = {
  documentCategory: 'passport' as const,
  mrz: 'P<GBR',
  mock: false,
} as any;

const aadhaarDoc = {
  documentCategory: 'aadhaar' as const,
  qrData: 'aadhaar-qr-1',
  mock: false,
  extractedFields: { aadhaarLast4Digits: '1234' },
} as any;

const kycDoc = {
  documentCategory: 'kyc' as const,
  mock: false,
} as any;

const mockDoc = {
  documentCategory: 'passport' as const,
  mrz: 'P<USA',
  mock: true,
} as any;

describe('IdCardLayout perks footer', () => {
  beforeEach(() => {
    MockOpenURL.mockReset();
    MockTrackEvent.mockReset();
    MockGetPerkRecordsForIdType.mockClear();
    MockGetPerkRecordsForIdType.mockImplementation((idType: string) =>
      idType === 'none'
        ? []
        : [
            {
              id: 'google_cloud_faucet',
              label: 'Google Cloud Faucet',
              isNew: true,
              outlinkUrl: 'https://example.test/perk',
            },
          ],
    );
    MockPerkRailProps = {};
  });

  it('renders the perk rail for selected hidden non-mock passport', () => {
    render(
      <IdCardLayout idDocument={passportDoc} selected={true} hidden={true} />,
    );
    expect(perkRailRendered()).toBe(true);
    expect(MockPerkRailProps.variant).toBe('dense');
    expect(MockPerkRailProps.logos).toHaveLength(1);
    expect(MockPerkRailProps.logos?.[0]).not.toBeNull();
  });

  it('fires ID_CARD_VIEWED exactly once on mount', () => {
    const { rerender } = render(
      <IdCardLayout idDocument={passportDoc} selected={true} hidden={true} />,
    );
    expect(MockTrackEvent).toHaveBeenCalledWith('Homescreen: ID Card Viewed', {
      id_type: 'p',
      has_perks: true,
      perk_count: 1,
    });
    expect(MockTrackEvent).toHaveBeenCalledTimes(1);
    rerender(
      <IdCardLayout idDocument={passportDoc} selected={true} hidden={true} />,
    );
    expect(MockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('re-fires ID_CARD_VIEWED when the document type changes', () => {
    const { rerender } = render(
      <IdCardLayout idDocument={passportDoc} selected={true} hidden={true} />,
    );
    expect(MockTrackEvent).toHaveBeenCalledTimes(1);
    rerender(
      <IdCardLayout idDocument={aadhaarDoc} selected={true} hidden={true} />,
    );
    expect(MockTrackEvent).toHaveBeenCalledTimes(2);
    expect(MockTrackEvent).toHaveBeenLastCalledWith(
      'Homescreen: ID Card Viewed',
      { id_type: 'a', has_perks: true, perk_count: 1 },
    );
  });

  it('re-fires ID_CARD_VIEWED when a same-type document changes', () => {
    const { rerender } = render(
      <IdCardLayout idDocument={passportDoc} selected={true} hidden={true} />,
    );
    expect(MockTrackEvent).toHaveBeenCalledTimes(1);
    rerender(
      <IdCardLayout
        idDocument={secondPassportDoc}
        selected={true}
        hidden={true}
      />,
    );
    expect(MockTrackEvent).toHaveBeenCalledTimes(2);
    expect(MockTrackEvent).toHaveBeenLastCalledWith(
      'Homescreen: ID Card Viewed',
      { id_type: 'p', has_perks: true, perk_count: 1 },
    );
  });

  it('fires ID_CARD_PERK_TAPPED and opens the outlink on rail press', async () => {
    MockOpenURL.mockResolvedValueOnce(undefined);
    render(
      <IdCardLayout idDocument={passportDoc} selected={true} hidden={true} />,
    );
    await act(async () => {
      await MockPerkRailProps.onPress?.();
    });
    expect(MockTrackEvent).toHaveBeenCalledWith(
      'Homescreen: ID Card Perk Tapped',
      {
        id_type: 'p',
        perk_id: 'google_cloud_faucet',
        has_outlink: true,
      },
    );
    expect(MockOpenURL).toHaveBeenCalledWith('https://example.test/perk');
  });

  it('fires ID_CARD_PERK_OUTLINK_OPEN_FAILED when openURL rejects', async () => {
    MockOpenURL.mockRejectedValueOnce(new Error('blocked'));
    render(
      <IdCardLayout idDocument={passportDoc} selected={true} hidden={true} />,
    );
    await act(async () => {
      await MockPerkRailProps.onPress?.();
    });
    expect(MockTrackEvent).toHaveBeenCalledWith(
      'Homescreen: ID Card Perk Outlink Open Failed',
      { id_type: 'p', perk_id: 'google_cloud_faucet' },
    );
  });

  it('suppresses footer when showPerks=false', () => {
    render(
      <IdCardLayout
        idDocument={passportDoc}
        selected={true}
        hidden={true}
        showPerks={false}
      />,
    );
    expect(perkRailRendered()).toBe(false);
    expect(MockTrackEvent).not.toHaveBeenCalled();
  });

  it('suppresses footer when the perks catalog is empty', () => {
    MockGetPerkRecordsForIdType.mockReturnValueOnce([]);
    render(
      <IdCardLayout idDocument={passportDoc} selected={true} hidden={true} />,
    );
    expect(perkRailRendered()).toBe(false);
    expect(MockTrackEvent).not.toHaveBeenCalled();
  });

  it('suppresses footer when isInactive', () => {
    render(
      <IdCardLayout
        idDocument={passportDoc}
        selected={true}
        hidden={true}
        isInactive={true}
      />,
    );
    expect(perkRailRendered()).toBe(false);
    expect(MockTrackEvent).not.toHaveBeenCalled();
  });

  it('suppresses footer for mock documents', () => {
    render(<IdCardLayout idDocument={mockDoc} selected={true} hidden={true} />);
    expect(perkRailRendered()).toBe(false);
    expect(MockTrackEvent).not.toHaveBeenCalled();
  });

  it('does not render the dark layout footer for KYC documents', () => {
    render(<IdCardLayout idDocument={kycDoc} selected={true} hidden={true} />);
    expect(perkRailRendered()).toBe(false);
    expect(MockTrackEvent).not.toHaveBeenCalled();
  });

  it('suppresses footer when hidden=false (reveal state)', () => {
    render(
      <IdCardLayout idDocument={passportDoc} selected={true} hidden={false} />,
    );
    expect(perkRailRendered()).toBe(false);
    expect(MockTrackEvent).not.toHaveBeenCalled();
  });

  it('renders a single-CTA rail and targets the first perk even if multiple are returned', async () => {
    MockGetPerkRecordsForIdType.mockReturnValueOnce([
      {
        id: 'google_cloud_faucet',
        label: 'Google Cloud Faucet',
        isNew: true,
        outlinkUrl: 'https://example.test/perk',
      },
      {
        id: 'second_perk',
        label: 'Second',
        isNew: false,
        outlinkUrl: 'https://example.test/second',
      },
    ]);
    MockOpenURL.mockResolvedValueOnce(undefined);
    render(
      <IdCardLayout idDocument={passportDoc} selected={true} hidden={true} />,
    );
    expect(MockPerkRailProps.logos).toHaveLength(1);
    await act(async () => {
      await MockPerkRailProps.onPress?.();
    });
    expect(MockTrackEvent).toHaveBeenCalledWith(
      'Homescreen: ID Card Perk Tapped',
      {
        id_type: 'p',
        perk_id: 'google_cloud_faucet',
        has_outlink: true,
      },
    );
    expect(MockOpenURL).toHaveBeenCalledWith('https://example.test/perk');
    expect(MockOpenURL).toHaveBeenCalledTimes(1);
  });

  it('suppresses footer when selected=false (collapsed)', () => {
    render(
      <IdCardLayout idDocument={passportDoc} selected={false} hidden={true} />,
    );
    expect(perkRailRendered()).toBe(false);
    expect(MockTrackEvent).not.toHaveBeenCalled();
  });
});
