// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { SocialSignOnPickerScreen as EuclidSocialSignOnPickerScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

export const SocialSignOnPickerScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const onApple = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('social_sign_on_picker_apple');
    navigate('/coming-soon');
  }, [navigate, haptic, analytics]);

  const onGoogle = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('social_sign_on_picker_google');
    navigate('/coming-soon');
  }, [navigate, haptic, analytics]);

  const onICloud = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('social_sign_on_picker_icloud');
    navigate('/coming-soon');
  }, [navigate, haptic, analytics]);

  const onGoogleCloud = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('social_sign_on_picker_google_cloud');
    navigate('/coming-soon');
  }, [navigate, haptic, analytics]);

  const onSeedPhrase = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('social_sign_on_picker_seed_phrase');
    navigate('/coming-soon');
  }, [navigate, haptic, analytics]);

  const onDismiss = useCallback(() => {
    haptic.trigger('selection');
    navigate('/');
  }, [navigate, haptic]);

  return (
    <EuclidSocialSignOnPickerScreen
      insets={WEB_SAFE_AREA.insets}
      onApple={onApple}
      onGoogle={onGoogle}
      onICloud={onICloud}
      onGoogleCloud={onGoogleCloud}
      onSeedPhrase={onSeedPhrase}
      onDismiss={onDismiss}
    />
  );
};
