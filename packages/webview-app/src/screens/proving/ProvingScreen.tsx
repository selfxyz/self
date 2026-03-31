// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { ProofRequestScreen, SelfLogo } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { useVerificationRequest } from '../../providers/VerificationRequestProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';
import { hasDiscloseRequestContext } from '../../utils/verificationRequest';

function titleCaseDisclosure(disclosure: string): string {
  return disclosure
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, match => match.toUpperCase());
}

export const ProvingScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic, lifecycle } = useSelfClient();
  const { request, displayLabels, appName, appEndpoint, timestamp } = useVerificationRequest();
  const hasValidRequestContext = hasDiscloseRequestContext({ request, displayLabels });

  useEffect(() => {
    if (!hasValidRequestContext) {
      navigate('/', { replace: true });
    }
  }, [hasValidRequestContext, navigate]);

  const proofItems = useMemo(() => {
    if (displayLabels && displayLabels.length > 0) {
      return displayLabels.map(label => ({ label }));
    }
    return (request.disclosures ?? []).map(key => ({
      label: titleCaseDisclosure(key),
    }));
  }, [displayLabels, request.disclosures]);

  const onVerify = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('prove_verify_pressed');
    navigate('/proving/generating', { replace: true });
  }, [analytics, haptic, navigate]);

  const onCancel = useCallback(async () => {
    haptic.trigger('selection');
    analytics.trackEvent('prove_verify_cancelled');
    try {
      await lifecycle.dismiss({ reason: 'user_cancel' });
    } finally {
      navigate('/', { replace: true });
    }
  }, [analytics, haptic, lifecycle, navigate]);

  if (!hasValidRequestContext) {
    return null;
  }

  return (
    <ProofRequestScreen
      {...WEB_SAFE_AREA}
      variant="default"
      onClose={onCancel}
      onConfirm={onVerify}
      appIcon={<SelfLogo size={40} />}
      appName={appName}
      appEndpoint={appEndpoint}
      timestamp={timestamp}
      items={proofItems}
      documentType="passport"
    />
  );
};
