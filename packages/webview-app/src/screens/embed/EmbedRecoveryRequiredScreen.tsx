// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { ConflictDetectedScreen as EuclidConflictDetectedScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import type { NavState } from '../../types/navState';
import { WEB_SAFE_AREA } from '../../utils/insets';

const TUNNEL_RECOVERY_RETURN_PATH = '/tunnel/proof/generating';
const TUNNEL_RECOVERY_BACK_PATH = '/tunnel/tour/4';

export const EmbedRecoveryRequiredScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const onRecoverWithPhrase = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('tunnel_recovery_phrase_selected');
    navigate('/recovery/phrase-input', {
      state: { nextPath: TUNNEL_RECOVERY_RETURN_PATH } satisfies Partial<NavState>,
    });
  }, [navigate, haptic, analytics]);

  const onCancel = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('tunnel_recovery_cancelled');
    navigate(TUNNEL_RECOVERY_BACK_PATH, { replace: true });
  }, [analytics, haptic, navigate]);

  return (
    <EuclidConflictDetectedScreen
      insets={WEB_SAFE_AREA.insets}
      title="Recovery Required"
      description="An existing account was found for this identity. Recover it with your recovery phrase to continue."
      primaryActionLabel="Recover with phrase"
      secondaryActionLabel="Cancel"
      onPrimaryAction={onRecoverWithPhrase}
      onSecondaryAction={onCancel}
      onClose={onCancel}
    />
  );
};
