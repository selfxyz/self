// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ProofRequestReceiptScreen as EuclidProofRequestReceiptScreen, SelfLogo } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

const MOCK_ITEMS = [
  { label: 'Full Name' },
  { label: 'Date of Birth' },
  { label: 'Nationality' },
  { label: 'Age above 18' },
];
const MOCK_WALLET_ADDRESS = '0x15a2...2P72';

export const ProofRequestReceiptScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic } = useSelfClient();

  const {
    appName = 'Self App',
    appEndpoint = 'self.xyz',
    documentType = 'passport',
  } = (location.state as {
    appName?: string;
    appEndpoint?: string;
    documentType?: string;
  }) || {};

  const onClose = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('proof_receipt_closed');
    navigate('/');
  }, [navigate, haptic, analytics]);

  return (
    <EuclidProofRequestReceiptScreen
      insets={WEB_SAFE_AREA.insets}
      onClose={onClose}
      appIcon={<SelfLogo size={40} />}
      appName={appName}
      appEndpoint={appEndpoint}
      documentType={documentType}
      timestamp={Date.now()}
      // Placeholder-only mock data until this preview route is wired to real proof receipt state.
      walletAddress={MOCK_WALLET_ADDRESS}
      isCloudBackupEnabled={false}
      items={MOCK_ITEMS}
    />
  );
};
