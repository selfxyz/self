// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ConflictDetectedScreen as EuclidConflictDetectedScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';
import { getPromptMockFromSearch, getPromptMockSearch, shouldUseHistoryBack } from '../../utils/mockOnboardingFlow';

export const ConflictDetectedScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();
  const mock = getPromptMockFromSearch(location.search);

  const onPrimaryAction = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('conflict_use_existing_pressed');
    navigate(`/onboarding/signin${getPromptMockSearch(mock === 'existing-account' ? mock : 'default')}`);
  }, [mock, navigate, haptic, analytics]);

  const onSecondaryAction = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('conflict_create_new_pressed');
    navigate('/');
  }, [navigate, haptic, analytics]);

  const onClose = useCallback(() => {
    haptic.trigger('selection');
    if (shouldUseHistoryBack()) {
      navigate(-1);
      return;
    }

    navigate(`/onboarding/signin${getPromptMockSearch(mock === 'existing-account' ? mock : 'default')}`);
  }, [mock, navigate, haptic]);

  return (
    <EuclidConflictDetectedScreen
      insets={WEB_SAFE_AREA.insets}
      title="Account Conflict Detected"
      description="An existing account was found with this identity. You can use the existing account or create a new one."
      primaryActionLabel="Use existing account"
      secondaryActionLabel="Create new account"
      onPrimaryAction={onPrimaryAction}
      onSecondaryAction={onSecondaryAction}
      onClose={onClose}
    />
  );
};
