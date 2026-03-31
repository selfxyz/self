// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { LeftArrowIcon, RecoverySuccessScreen as EuclidRecoverySuccessScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

export const RecoverySuccessScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const searchParams = new URLSearchParams(location.search);
  const returnTo = searchParams.get('returnTo');

  const onClose = useCallback(() => {
    haptic.trigger('success');
    analytics.trackEvent('recovery_success_continue_pressed');
    navigate(returnTo ?? '/', { replace: true });
  }, [navigate, haptic, analytics, returnTo]);

  return (
    <EuclidRecoverySuccessScreen
      insets={WEB_SAFE_AREA.insets}
      escapeIcon={({ size, color }) => <LeftArrowIcon size={size} color={color} />}
      logo={<img src="/logos/self.svg" alt="" width={64} height={64} aria-hidden="true" />}
      onClose={onClose}
      onAppleBackup={() => navigate('/coming-soon')}
      onGoogleBackup={() => navigate('/coming-soon')}
    />
  );
};
