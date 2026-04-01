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

export const TunnelKycSuccessScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic } = useSelfClient();

  const state = location.state as { providerResult?: KycProviderResult } | null;
  const providerResult = state?.providerResult;

  useEffect(() => {
    if (!providerResult) return;

    if (providerResult.status === 'cancel') {
      navigate(-1);
      return;
    }

    if (providerResult.status === 'error') {
      if (providerResult.error?.retryable === false) {
        navigate('/onboarding/failure', { replace: true });
      } else {
        navigate('/tunnel/kyc', { replace: true });
      }
      return;
    }
  }, [providerResult, navigate]);

  const onGenerateProof = useCallback(() => {
    haptic.trigger('success');
    analytics.trackEvent('tunnel_kyc_success_generate_proof');
    navigate('/tunnel/proof/generating');
  }, [navigate, haptic, analytics]);

  return <KycVerificationSuccessScreen insets={WEB_SAFE_AREA.insets} onGenerateProof={onGenerateProof} />;
};
