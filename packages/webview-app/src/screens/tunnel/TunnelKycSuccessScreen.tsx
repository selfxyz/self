// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { KycVerificationSuccessScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import type { KycProviderResult } from '../../types/kycProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';
import { isDemoMode } from '../../utils/mockOnboardingFlow';

export const TunnelKycSuccessScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic } = useSelfClient();

  const state = location.state as { providerResult?: KycProviderResult } | null;
  const providerResult = state?.providerResult;

  const demo = isDemoMode(location.search);

  useEffect(() => {
    if (demo || !providerResult) return;

    if (providerResult.status === 'cancel') {
      navigate('/tunnel/tour/4', { replace: true });
      return;
    }

    if (providerResult.status === 'error') {
      if (providerResult.error?.retryable === false) {
        navigate('/tunnel/tour/4', { replace: true });
      } else {
        navigate('/tunnel/kyc-failure', { replace: true, state: { providerResult } });
      }
      return;
    }
  }, [demo, providerResult, navigate]);

  const onGenerateProof = useCallback(() => {
    haptic.trigger('success');
    analytics.trackEvent('tunnel_kyc_success_generate_proof');
    navigate(`/tunnel/proof/generating${location.search}`);
  }, [navigate, location.search, haptic, analytics]);

  return <KycVerificationSuccessScreen insets={WEB_SAFE_AREA.insets} onGenerateProof={onGenerateProof} />;
};
