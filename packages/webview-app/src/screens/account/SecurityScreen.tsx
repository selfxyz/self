// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  CloudKeyIcon,
  LeftArrowIcon,
  LockIcon,
  SecurityScreen as EuclidSecurityScreen,
  ZapShieldIcon,
} from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';

export const SecurityScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();
  const [isBackupEnabled, setIsBackupEnabled] = useState(false);
  const [showDisableDialogue, setShowDisableDialogue] = useState(false);

  const onBack = useCallback(() => {
    haptic.trigger('selection');
    navigate('/settings');
  }, [navigate, haptic]);

  const onBackupAccount = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('security_backup_account_pressed');
    navigate('/coming-soon');
  }, [navigate, haptic, analytics]);

  const onRevealRecoveryPhrase = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('security_reveal_phrase_pressed');
    navigate('/coming-soon');
  }, [navigate, haptic, analytics]);

  const onRestoreAccount = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('security_restore_account_pressed');
    navigate('/coming-soon');
  }, [navigate, haptic, analytics]);

  const onDisableBackups = useCallback(() => {
    haptic.trigger('warning');
    setShowDisableDialogue(true);
  }, [haptic]);

  const onDisableICloudBackups = useCallback(() => {
    haptic.trigger('warning');
    analytics.trackEvent('security_backups_disabled');
    setIsBackupEnabled(false);
    setShowDisableDialogue(false);
  }, [haptic, analytics]);

  const onDismissDialogue = useCallback(() => {
    haptic.trigger('selection');
    setShowDisableDialogue(false);
  }, [haptic]);

  return (
    <EuclidSecurityScreen
      insets={{ top: 0, bottom: 0 }}
      escapeIcon={({ size, color }) => <LeftArrowIcon size={size} color={color} />}
      cloudKeyIcon={CloudKeyIcon}
      lockIcon={LockIcon}
      zapShieldIcon={ZapShieldIcon}
      isBackupEnabled={isBackupEnabled}
      onBack={onBack}
      onBackupAccount={onBackupAccount}
      onRevealRecoveryPhrase={onRevealRecoveryPhrase}
      onRestoreAccount={onRestoreAccount}
      onDisableBackups={onDisableBackups}
      showDisableDialogue={showDisableDialogue}
      onDisableICloudBackups={onDisableICloudBackups}
      onDismissDialogue={onDismissDialogue}
    />
  );
};
