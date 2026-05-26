// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { RegistrationFailureScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import type { NavState } from '../../types/navState';
import { WEB_SAFE_AREA } from '../../utils/insets';

// TODO: Replace with dedicated RecoveryFailureScreen from Euclid
// once SELF-2345 (recovery phrase UX redesign) lands.
export const RecoveryFailureScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic } = useSelfClient();

  const nextPath = (location.state as Partial<NavState> | null)?.nextPath ?? null;

  const handleClose = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('recovery_failure_dismissed');
    navigate('/', { replace: true });
  }, [analytics, haptic, navigate]);

  const handleRetry = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('recovery_failure_try_again');
    navigate('/recovery/phrase-input', {
      replace: true,
      state: nextPath ? ({ nextPath } satisfies Partial<NavState>) : undefined,
    });
  }, [analytics, haptic, navigate, nextPath]);

  return (
    <RegistrationFailureScreen
      {...WEB_SAFE_AREA}
      onDismiss={handleClose}
      onTryDifferentMethod={handleRetry}
      copy={{
        title: 'Recovery failed',
        body: 'Something went wrong while restoring your account. You can try again or dismiss to return home.',
        dismiss: 'Go home',
        tryDifferentMethod: 'Try again',
      }}
    />
  );
};
