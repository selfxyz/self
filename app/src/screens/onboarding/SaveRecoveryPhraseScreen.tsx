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
import {
  black,
  slate400,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import Mnemonic from '@/components/Mnemonic';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import useMnemonic from '@/hooks/useMnemonic';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import { STORAGE_NAME } from '@/services/cloud-backup';
import { useSettingStore } from '@/stores/settingStore';
import { getRecoveryPhraseWarningMessage } from '@/utils/crypto/mnemonic';

const SaveRecoveryPhraseScreen: React.FC = () => {
  const [userHasSeenMnemonic, setUserHasSeenMnemonic] = useState(false);
  const { mnemonic, loadMnemonic } = useMnemonic();
  // DISABLED FOR NOW: Turnkey functionality
  // const { cloudBackupEnabled, turnkeyBackupEnabled } = useSettingStore();
  const { cloudBackupEnabled } = useSettingStore();

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
          {getRecoveryPhraseWarningMessage()}
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
          Manage {STORAGE_NAME} backups
        </PrimaryButton>
        <SecondaryButton onPress={onSkipPress}>
          {userHasSeenMnemonic || cloudBackupEnabled
            ? 'Continue'
            : 'Skip making a backup'}
        </SecondaryButton>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default SaveRecoveryPhraseScreen;
