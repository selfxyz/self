// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { ProofRequestScreen, SelfLogo } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { useVerificationRequest } from '../../providers/VerificationRequestProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';
import { titleCaseDisclosure } from '../../utils/provingUtils';

export const TunnelProofReceiptScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();
  const { displayLabels, request, appName, appEndpoint, timestamp } = useVerificationRequest();

  const onConfirm = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('tunnel_proof_receipt_confirmed');
    navigate('/tunnel/proof/disclose');
  }, [navigate, haptic, analytics]);

  const proofItems = useMemo(() => {
    if (displayLabels && displayLabels.length > 0) {
      return displayLabels.map(label => ({ label }));
    }
    return (request.disclosures ?? []).map(key => ({
      label: titleCaseDisclosure(key),
    }));
  }, [displayLabels, request.disclosures]);

  const onClose = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('tunnel_proof_receipt_closed');
    navigate(-1);
  }, [navigate, haptic, analytics]);

  return (
    <ProofRequestScreen
      {...WEB_SAFE_AREA}
      variant="default"
      onClose={onClose}
      onConfirm={onConfirm}
      appIcon={<SelfLogo size={40} />}
      appName={appName}
      appEndpoint={appEndpoint}
      documentType="passport"
      timestamp={timestamp}
      items={proofItems}
    />
  );
};
