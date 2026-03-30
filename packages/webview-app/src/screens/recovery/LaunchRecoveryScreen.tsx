// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { LaunchRecoveryScreen as EuclidLaunchRecoveryScreen, LeftArrowIcon } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

export const LaunchRecoveryScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const onClose = useCallback(() => {
    haptic.trigger('selection');
    navigate('/');
  }, [navigate, haptic]);

  const onEnterRecoveryPhrase = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('recovery_enter_phrase_pressed');
    navigate('/recovery/phrase-input');
  }, [navigate, haptic, analytics]);

  return (
    <div className="launch-recovery-screen">
      <EuclidLaunchRecoveryScreen
        insets={WEB_SAFE_AREA.insets}
        escapeIcon={({ size, color }) => <LeftArrowIcon size={size} color={color} />}
        onClose={onClose}
        onAppleBackup={() => navigate('/coming-soon')}
        onGoogleBackup={() => navigate('/coming-soon')}
        onEnterRecoveryPhrase={onEnterRecoveryPhrase}
        backgroundImage="/backgrounds/restore.png"
      />
    </div>
  );
};
