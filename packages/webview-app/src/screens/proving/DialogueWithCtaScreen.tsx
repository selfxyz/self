// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { DialogueWithCtaScreen as EuclidDialogueWithCtaScreen, LeftArrowIcon } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

export const DialogueWithCtaScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const onClose = useCallback(() => {
    haptic.trigger('selection');
    navigate(-1);
  }, [navigate, haptic]);

  const onPrimaryPress = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('dialogue_cta_primary_pressed');
    navigate('/');
  }, [navigate, haptic, analytics]);

  const onSecondaryPress = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('dialogue_cta_secondary_pressed');
    navigate(-1);
  }, [navigate, haptic, analytics]);

  return (
    <EuclidDialogueWithCtaScreen
      insets={WEB_SAFE_AREA.insets}
      showTopNavigation
      onClose={onClose}
      closeIcon={({ size, color }) => <LeftArrowIcon size={size} color={color} />}
      backgroundImage="/backgrounds/dialogue-background.jpg"
      headerText="Action Required"
      descriptionText="Please review the information below and choose how you'd like to proceed."
      primaryButtonText="Continue"
      secondaryButtonText="Cancel"
      onPrimaryButtonPress={onPrimaryPress}
      onSecondaryButtonPress={onSecondaryPress}
    />
  );
};
