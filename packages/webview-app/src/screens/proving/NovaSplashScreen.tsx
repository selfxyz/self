// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { LeftArrowIcon, NovaSplashScreen as EuclidNovaSplashScreen, SelfLogo } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

export const NovaSplashScreen: React.FC = () => {
  const navigate = useNavigate();
  const { haptic } = useSelfClient();

  const onClose = useCallback(() => {
    haptic.trigger('selection');
    navigate(-1);
  }, [navigate, haptic]);

  return (
    <EuclidNovaSplashScreen
      insets={WEB_SAFE_AREA.insets}
      showTopNavigation
      onClose={onClose}
      closeIcon={({ size, color }) => <LeftArrowIcon size={size} color={color} />}
      backgroundImage="/backgrounds/dialogue-background.jpg"
      title="Nova Connection"
      description="Your Self identity is now connected via Nova. This secure connection allows verified interactions."
      novaPin="1234"
      appIcon={<SelfLogo size={40} />}
      selfIcon={<SelfLogo size={40} />}
    />
  );
};
