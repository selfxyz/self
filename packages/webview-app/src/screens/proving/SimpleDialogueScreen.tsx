// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { LeftArrowIcon, SimpleDialogueScreen as EuclidSimpleDialogueScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

export const SimpleDialogueScreen: React.FC = () => {
  const navigate = useNavigate();
  const { haptic } = useSelfClient();

  const onClose = useCallback(() => {
    haptic.trigger('selection');
    navigate(-1);
  }, [navigate, haptic]);

  return (
    <EuclidSimpleDialogueScreen
      insets={WEB_SAFE_AREA.insets}
      showTopNavigation
      onClose={onClose}
      closeIcon={({ size, color }) => <LeftArrowIcon size={size} color={color} />}
      backgroundImage="/backgrounds/dialogue-background-simple.jpg"
      headerText="Information"
      descriptionText="This is a simple dialogue screen used for displaying informational messages to the user."
    />
  );
};
