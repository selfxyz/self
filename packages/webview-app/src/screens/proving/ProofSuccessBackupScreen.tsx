// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { ProofSuccessBackupScreen as EuclidProofSuccessBackupScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

export const ProofSuccessBackupScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const onRemindLater = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('proof_success_backup_remind_later');
    navigate('/');
  }, [navigate, haptic, analytics]);

  const onBackupAccount = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('proof_success_backup_pressed');
    navigate('/settings/backup');
  }, [navigate, haptic, analytics]);

  return (
    <EuclidProofSuccessBackupScreen
      insets={WEB_SAFE_AREA.insets}
      idCard={{
        variant: 'passport',
        title: 'PASSPORT',
        subtitle: 'Verified US Passport',
        walletAddress: '0xd9..b94',
        footerTitle: 'US PASSPORT',
        securityLevel: 'hi',
      }}
      title="Back up your account"
      description="Protect your identity data by setting up a backup. You can always do this later in Settings."
      onRemindLater={onRemindLater}
      onBackupAccount={onBackupAccount}
    />
  );
};
