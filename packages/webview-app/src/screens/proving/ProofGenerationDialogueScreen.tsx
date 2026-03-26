// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  LeftArrowIcon,
  ProofGenerationDialogueScreen as EuclidProofGenerationDialogueScreen,
  SelfLogo,
} from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

export const ProofGenerationDialogueScreen: React.FC = () => {
  const navigate = useNavigate();
  const { haptic } = useSelfClient();

  const onClose = useCallback(() => {
    haptic.trigger('selection');
    navigate(-1);
  }, [navigate, haptic]);

  return (
    <EuclidProofGenerationDialogueScreen
      insets={WEB_SAFE_AREA.insets}
      showTopNavigation
      onClose={onClose}
      closeIcon={({ size, color }) => <LeftArrowIcon size={size} color={color} />}
      backgroundImage="/backgrounds/dialogue-background.jpg"
      step="generatingProof"
      appIcon={<SelfLogo size={40} />}
      totalSteps={4}
      currentStepIndex={1}
    />
  );
};
