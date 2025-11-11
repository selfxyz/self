// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useState } from 'react';

import {
  Caption,
  Description,
  PrimaryButton,
  SecondaryButton,
  Title,
} from '@selfxyz/mobile-sdk-alpha/components';

import Mnemonic from '@/components/Mnemonic';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import useMnemonic from '@/hooks/useMnemonic';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import { useSettingStore } from '@/stores/settingStore';
import { STORAGE_NAME } from '@/utils/cloudBackup';
import { black, slate400, white } from '@/utils/colors';

const SaveRecoveryPhraseScreen: React.FC = () => {
  const [userHasSeenMnemonic, setUserHasSeenMnemonic] = useState(false);
  const { mnemonic, loadMnemonic } = useMnemonic();
  const { cloudBackupEnabled, turnkeyBackupEnabled } = useSettingStore();

  const onRevealWords = useCallback(async () => {
    await loadMnemonic();
    setUserHasSeenMnemonic(true);
  }, [loadMnemonic]);

  const onCloudBackupPress = useHapticNavigation('CloudBackupSettings', {
    params: { nextScreen: 'SaveRecoveryPhrase' },
  });
  const onSkipPress = useHapticNavigation('AccountVerifiedSuccess', {
    action: 'confirm',
  });

  return (
    <ExpandableBottomLayout.Layout backgroundColor={black}>
      <ExpandableBottomLayout.TopSection
        roundTop
        backgroundColor={white}
        justifyContent="space-between"
        gap={10}
      >
        <Title style={{ paddingTop: 20, textAlign: 'center' }}>
          Save your recovery phrase
        </Title>
        <Description style={{ paddingBottom: 10 }}>
          This phrase is the only way to recover your account. Keep it secret,
          keep it safe.
        </Description>
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection
        style={{ paddingTop: 0 }}
        gap={10}
        backgroundColor={white}
      >
        <Mnemonic words={mnemonic} onRevealWords={onRevealWords} />
        <Caption style={{ color: slate400 }}>
          You can reveal your recovery phrase or manage your backups in
          settings.
        </Caption>
        <PrimaryButton onPress={onCloudBackupPress}>
          Manage {STORAGE_NAME} or Turnkey backups
        </PrimaryButton>
        <SecondaryButton onPress={onSkipPress}>
          {userHasSeenMnemonic || cloudBackupEnabled || turnkeyBackupEnabled
            ? 'Continue'
            : 'Skip making a backup'}
        </SecondaryButton>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default SaveRecoveryPhraseScreen;
