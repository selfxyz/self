// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ProofRequestScreen, SelfLogo } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { useVerificationRequest } from '../../providers/VerificationRequestProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';
import { titleCaseDisclosure } from '../../utils/provingUtils';
import { hasDiscloseRequestContext } from '../../utils/verificationRequest';

export const ProvingScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic, lifecycle } = useSelfClient();
  const { request, displayLabels, appName, displayAppEndpoint, timestamp } = useVerificationRequest();
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

  const handleStartProving = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('prove_verify_pressed');
    navigate({ pathname: '/disclose/generating', search: location.search }, { replace: true });
  }, [analytics, haptic, location.search, navigate]);

  const handleClose = useCallback(async () => {
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
      onClose={handleClose}
      onConfirm={handleStartProving}
      appIcon={<SelfLogo size={40} />}
      appName={appName}
      appEndpoint={displayAppEndpoint}
      timestamp={timestamp}
      items={proofItems}
      documentType="passport"
    />
  );
};
