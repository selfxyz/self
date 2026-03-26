// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { LeftArrowIcon, RecoverySuccessScreen as EuclidRecoverySuccessScreen, SelfLogo } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';

const insets = { top: 0, bottom: 0 };

export const RecoverySuccessScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const onClose = useCallback(() => {
    haptic.trigger('success');
    analytics.trackEvent('recovery_success_continue_pressed');
    navigate('/');
  }, [navigate, haptic, analytics]);

  return (
    <EuclidRecoverySuccessScreen
      insets={insets}
      escapeIcon={({ size, color }) => <LeftArrowIcon size={size} color={color} />}
      logo={<SelfLogo size={64} />}
      onClose={onClose}
      onAppleBackup={() => navigate('/coming-soon')}
      onGoogleBackup={() => navigate('/coming-soon')}
    />
  );
};
