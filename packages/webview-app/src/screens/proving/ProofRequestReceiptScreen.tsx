// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { ProofRequestReceiptScreen as EuclidProofRequestReceiptScreen, SelfLogo } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { useVerificationRequest } from '../../providers/VerificationRequestProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';
import { titleCaseDisclosure } from '../../utils/provingUtils';

export const ProofRequestReceiptScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();
  const { request, displayLabels, appName, displayAppEndpoint, timestamp } = useVerificationRequest();

  const items = useMemo(() => {
    if (displayLabels && displayLabels.length > 0) {
      return displayLabels.map(label => ({ label }));
    }
    return (request.disclosures ?? []).map(key => ({ label: titleCaseDisclosure(key) }));
  }, [displayLabels, request.disclosures]);

  const walletAddress = request.userId?.startsWith('0x') ? request.userId : undefined;

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
      appEndpoint={displayAppEndpoint}
      documentType="passport"
      timestamp={timestamp}
      walletAddress={walletAddress}
      isCloudBackupEnabled={false}
      items={items}
    />
  );
};
