// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { KycFailureScreen as EuclidKycFailureScreen } from '@selfxyz/euclid';

import { SupportReference } from '../../components/SupportReference';
import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

export const EmbedKycFailureScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const handleClose = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('tunnel_kyc_failure_dismissed');
    navigate('/tour/4', { replace: true });
  }, [analytics, haptic, navigate]);

  const handleRetry = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('tunnel_kyc_failure_retry_pressed');
    navigate('/capture/kyc', { replace: true });
  }, [analytics, haptic, navigate]);

  return (
    <>
      <EuclidKycFailureScreen {...WEB_SAFE_AREA} onDismiss={handleClose} onTryAgain={handleRetry} />
      <SupportReference />
    </>
  );
};
