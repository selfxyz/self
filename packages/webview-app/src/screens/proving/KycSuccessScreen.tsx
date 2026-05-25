// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { KycVerificationSuccessScreen as EuclidKycVerificationSuccessScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

export const KycSuccessScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const onGenerateProof = useCallback(() => {
    haptic.trigger('success');
    analytics.trackEvent('kyc_verification_success_generate_proof');
    navigate('/proving', { replace: true });
  }, [navigate, haptic, analytics]);

  return <EuclidKycVerificationSuccessScreen insets={WEB_SAFE_AREA.insets} onGenerateProof={onGenerateProof} />;
};
