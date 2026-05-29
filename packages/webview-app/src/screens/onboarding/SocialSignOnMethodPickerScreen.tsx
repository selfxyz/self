// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { SocialSignOnMethodPickerScreen as EuclidSocialSignOnMethodPickerScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';
import { getPromptMockFromSearch, getPromptMockSearch } from '../../utils/mockOnboardingFlow';

export const SocialSignOnMethodPickerScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();
  const mock = getPromptMockFromSearch(location.search);

  const onApple = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('social_sign_on_apple_pressed');
    navigate('/coming-soon');
  }, [navigate, haptic, analytics]);

  const onGoogle = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('social_sign_on_google_pressed');
    navigate('/coming-soon');
  }, [navigate, haptic, analytics]);

  const onSeedPhrase = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('social_sign_on_seed_phrase_pressed');
    navigate(`/onboarding/recovery-phrase${getPromptMockSearch(mock)}`);
  }, [mock, navigate, haptic, analytics]);

  const onDismiss = useCallback(() => {
    haptic.trigger('selection');
    navigate(`/onboarding/notifications${getPromptMockSearch(mock)}`);
  }, [mock, navigate, haptic]);

  return (
    <EuclidSocialSignOnMethodPickerScreen
      insets={WEB_SAFE_AREA.insets}
      onApple={onApple}
      onGoogle={onGoogle}
      onSeedPhrase={onSeedPhrase}
      onDismiss={onDismiss}
    />
  );
};
