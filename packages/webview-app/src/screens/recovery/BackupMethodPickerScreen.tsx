// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  BackupMethodPickerScreen as EuclidBackupMethodPickerScreen,
  CloudKeyIcon,
  LeftArrowIcon,
  LockIcon,
  ZapShieldIcon,
} from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

export const BackupMethodPickerScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const handleClose = useCallback(() => {
    haptic.trigger('selection');
    navigate('/settings/security');
  }, [navigate, haptic]);

  const onICloudBackup = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('backup_method_icloud_pressed');
    navigate('/coming-soon');
  }, [navigate, haptic, analytics]);

  const onRecoveryPhrase = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('backup_method_phrase_pressed');
    navigate('/settings/recovery-phrase');
  }, [navigate, haptic, analytics]);

  return (
    <EuclidBackupMethodPickerScreen
      insets={WEB_SAFE_AREA.insets}
      title="Back up your account"
      description="Choose how you'd like to secure your identity data. You can always change this later."
      subtitle="Backup"
      iconContainer={<CloudKeyIcon size={48} color="#000" />}
      options={[
        {
          id: 'icloud',
          label: 'iCloud Backup',
          icon: <CloudKeyIcon size={24} color="#000" />,
          onPress: onICloudBackup,
        },
        {
          id: 'recovery-phrase',
          label: 'Recovery Phrase',
          icon: <LockIcon size={24} color="#000" />,
          onPress: onRecoveryPhrase,
        },
        {
          id: 'turnkey',
          label: 'Turnkey Backup',
          icon: <ZapShieldIcon size={24} color="#000" />,
          onPress: () => navigate('/coming-soon'),
          disabled: true,
        },
      ]}
      closeIcon={({ size, color }) => <LeftArrowIcon size={size} color={color} />}
      onClose={handleClose}
    />
  );
};
