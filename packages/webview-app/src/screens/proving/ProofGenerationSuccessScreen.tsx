// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { ProofGenerationSuccessScreen as EuclidProofGenerationSuccessScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

export const ProofGenerationSuccessScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const onShieldIdentity = useCallback(() => {
    haptic.trigger('success');
    analytics.trackEvent('proof_generation_success_shield_pressed');
    navigate('/');
  }, [navigate, haptic, analytics]);

  return (
    <EuclidProofGenerationSuccessScreen
      insets={WEB_SAFE_AREA.insets}
      title="Proof Generated"
      description="Your zero-knowledge proof has been successfully generated and verified."
      buttonLabel="Shield Identity"
      onShieldIdentity={onShieldIdentity}
    />
  );
};
