// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import type { Location } from 'react-router-dom';
import { useLocation, useNavigate } from 'react-router-dom';

import { RegistrationFailureScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

function getReturnTo(location: Location): string | null {
  const searchParams = new URLSearchParams(location.search);
  const state = location.state as { returnTo?: string } | null;
  return searchParams.get('returnTo') ?? state?.returnTo ?? null;
}

// TODO: Replace with dedicated RecoveryFailureScreen from Euclid
// once SELF-2345 (recovery phrase UX redesign) lands.
export const RecoveryFailureScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic } = useSelfClient();

  const returnTo = getReturnTo(location);

  const onDismiss = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('recovery_failure_dismissed');
    navigate('/');
  }, [analytics, haptic, navigate]);

  const onTryAgain = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('recovery_failure_try_again');

    const target = returnTo
      ? `/recovery/phrase-input?returnTo=${encodeURIComponent(returnTo)}`
      : '/recovery/phrase-input';

    navigate(target, {
      replace: true,
      state: returnTo ? { returnTo } : undefined,
    });
  }, [analytics, haptic, navigate, returnTo]);

  return (
    <RegistrationFailureScreen
      {...WEB_SAFE_AREA}
      onDismiss={onDismiss}
      onTryDifferentMethod={onTryAgain}
      copy={{
        title: 'Recovery failed',
        body: 'Something went wrong while restoring your account. You can try again or dismiss to return home.',
        dismiss: 'Go home',
        tryDifferentMethod: 'Try again',
      }}
    />
  );
};
