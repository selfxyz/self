// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { render } from '@testing-library/react-native';

import { MultichainProgress } from '@/components/MultichainProgress';
import type { MultichainStatus } from '@/stores/proofTypes';

// Mock Tamagui components
jest.mock('tamagui', () => ({
  Text: ({ children, ...props }: any) => {
    const { Text } = require('react-native');
    return <Text {...props}>{children}</Text>;
  },
  View: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
  XStack: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
  YStack: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

// Mock colors and fonts
jest.mock('@selfxyz/mobile-sdk-alpha/constants/colors', () => ({
  cyan300: '#00ffff',
  red500: '#ff0000',
  slate400: '#888888',
  slate600: '#666666',
  white: '#ffffff',
  zinc500: '#555555',
  zinc900: '#111111',
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/fonts', () => ({
  dinot: 'dinot',
  advercase: 'advercase',
}));

describe('MultichainProgress Component', () => {
  describe('Step Progress Display', () => {
    it('should show step 1 of 3 when origin is pending', () => {
      const status: MultichainStatus = {
        isMultichain: true,
        destChainId: 8453,
        destChainName: 'Base',
        origin: { status: 'pending' },
        bridge: { status: 'pending' },
        destination: { status: 'pending' },
      };

      const { getByText } = render(<MultichainProgress status={status} />);

      expect(getByText('Multichain Verification')).toBeTruthy();
      expect(getByText('Step 1 of 3')).toBeTruthy();
      expect(getByText('Verifying on Celo')).toBeTruthy();
      expect(getByText('Bridging to Base')).toBeTruthy();
      expect(getByText('Delivered')).toBeTruthy();
    });

    it('should show step 2 of 3 when origin is complete', () => {
      const status: MultichainStatus = {
        isMultichain: true,
        destChainId: 8453,
        destChainName: 'Base',
        origin: { status: 'complete', txHash: '0x1234567890abcdef' },
        bridge: { status: 'in_progress', detail: 'Waiting for confirmations' },
        destination: { status: 'pending' },
      };

      const { getByText } = render(<MultichainProgress status={status} />);

      expect(getByText('Step 2 of 3')).toBeTruthy();
      expect(getByText('Waiting for confirmations')).toBeTruthy();
    });

    it('should show step 3 of 3 when delivery is complete', () => {
      const status: MultichainStatus = {
        isMultichain: true,
        destChainId: 8453,
        destChainName: 'Base',
        origin: { status: 'complete', txHash: '0x1234567890abcdef' },
        bridge: { status: 'complete', protocol: 'layerzero' },
        destination: { status: 'complete', txHash: '0xabcdef1234567890' },
      };

      const { getByText } = render(<MultichainProgress status={status} />);

      expect(getByText('Step 3 of 3')).toBeTruthy();
      expect(getByText('Via LayerZero')).toBeTruthy();
    });

    it('should display Wormhole protocol when used', () => {
      const status: MultichainStatus = {
        isMultichain: true,
        destChainId: 100,
        destChainName: 'Gnosis',
        origin: { status: 'complete' },
        bridge: { status: 'complete', protocol: 'wormhole' },
        destination: { status: 'complete' },
      };

      const { getByText } = render(<MultichainProgress status={status} />);

      expect(getByText('Via Wormhole')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should render scope query failure error', () => {
      const status: MultichainStatus = {
        isMultichain: true,
        destChainId: 8453,
        destChainName: 'Base',
        origin: { status: 'failed' },
        bridge: {
          status: 'failed',
          detail: '0x1234.scope() on chain 8453 failed: RPC timeout',
        },
        destination: { status: 'pending' },
      };

      const { getByText } = render(<MultichainProgress status={status} />);

      expect(getByText('Verification Failed')).toBeTruthy();
      expect(getByText('0x1234.scope() on chain 8453 failed')).toBeTruthy();
      expect(getByText('Please contact dApp support')).toBeTruthy();
    });

    it('should render fee estimation failure error', () => {
      const status: MultichainStatus = {
        isMultichain: true,
        destChainId: 8453,
        destChainName: 'Base',
        origin: { status: 'pending' },
        bridge: {
          status: 'failed',
          detail: 'Bridge fee estimation failed for chain 8453',
        },
        destination: { status: 'pending' },
      };

      const { getByText } = render(<MultichainProgress status={status} />);

      expect(getByText('Bridge Fee Estimation Failed')).toBeTruthy();
      expect(
        getByText('Unable to calculate bridge cost. Please try again.'),
      ).toBeTruthy();
    });

    it('should render failed bridge status detail', () => {
      const status: MultichainStatus = {
        isMultichain: true,
        destChainId: 8453,
        destChainName: 'Base',
        origin: { status: 'complete' },
        bridge: { status: 'failed', detail: 'Bridge transaction reverted' },
        destination: { status: 'pending' },
      };

      const { getByText } = render(<MultichainProgress status={status} />);

      expect(getByText('Bridge transaction reverted')).toBeTruthy();
    });
  });

  describe('Different Chain Destinations', () => {
    it('should display Gnosis chain name', () => {
      const status: MultichainStatus = {
        isMultichain: true,
        destChainId: 100,
        destChainName: 'Gnosis',
        origin: { status: 'complete' },
        bridge: { status: 'in_progress' },
        destination: { status: 'pending' },
      };

      const { getByText } = render(<MultichainProgress status={status} />);

      expect(getByText('Bridging to Gnosis')).toBeTruthy();
    });

    it('should display Optimism chain name', () => {
      const status: MultichainStatus = {
        isMultichain: true,
        destChainId: 10,
        destChainName: 'Optimism',
        origin: { status: 'complete' },
        bridge: { status: 'in_progress' },
        destination: { status: 'pending' },
      };

      const { getByText } = render(<MultichainProgress status={status} />);

      expect(getByText('Bridging to Optimism')).toBeTruthy();
    });

    it('should handle missing chain name gracefully', () => {
      const status: MultichainStatus = {
        isMultichain: true,
        destChainId: 8453,
        origin: { status: 'complete' },
        bridge: { status: 'in_progress' },
        destination: { status: 'pending' },
      };

      const { getByText } = render(<MultichainProgress status={status} />);

      expect(getByText('Bridging to destination chain')).toBeTruthy();
    });
  });

  describe('Transaction Hash Display', () => {
    it('should display truncated origin transaction hash', () => {
      const status: MultichainStatus = {
        isMultichain: true,
        destChainId: 8453,
        destChainName: 'Base',
        origin: {
          status: 'complete',
          txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef',
        },
        bridge: { status: 'in_progress' },
        destination: { status: 'pending' },
      };

      const { getByText } = render(<MultichainProgress status={status} />);

      expect(getByText(/Tx: 0x12345678.../)).toBeTruthy();
    });

    it('should display truncated destination transaction hash', () => {
      const status: MultichainStatus = {
        isMultichain: true,
        destChainId: 8453,
        destChainName: 'Base',
        origin: { status: 'complete' },
        bridge: { status: 'complete' },
        destination: {
          status: 'complete',
          txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890',
        },
      };

      const { getByText } = render(<MultichainProgress status={status} />);

      expect(getByText(/Tx: 0xabcdef12.../)).toBeTruthy();
    });
  });

  describe('ETA Display', () => {
    it('should display ETA when provided', () => {
      const status: MultichainStatus = {
        isMultichain: true,
        destChainId: 8453,
        destChainName: 'Base',
        origin: { status: 'complete' },
        bridge: { status: 'in_progress', eta: '~2 minutes' },
        destination: { status: 'pending' },
      };

      const { getByText } = render(<MultichainProgress status={status} />);

      expect(getByText('~2 minutes')).toBeTruthy();
    });
  });
});
