// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { DialogueWithCtaScreen as EuclidDialogueWithCtaScreen, HeartFillIcon } from '@selfxyz/euclid';

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
      backgroundImage="/backgrounds/dialogue-background.jpg"
      headerText="This is placeholder header text"
      descriptionText="When friends install Self and use your referral link you'll both receive exclusive points. Learn more"
      primaryButtonText="Begin liveliness check"
      primaryButtonIcon={({ size }) => <HeartFillIcon size={size} color="#E53935" />}
      secondaryButtonText="Skip for now"
      helperContent={
        <span
          style={{
            fontFamily: 'DIN OT, DIN, sans-serif',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            textAlign: 'center',
            width: '100%',
            display: 'block',
          }}
        >
          What is a liveliness check?
        </span>
      }
      showHelperContent
      onPrimaryButtonPress={onPrimaryPress}
      onSecondaryButtonPress={onSecondaryPress}
    />
  );
};
