// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useMemo, useState } from 'react';

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
import useCompactLayout from '@/hooks/useCompactLayout';
import { useSettingStore } from '@/stores/settingStore';
import { STORAGE_NAME } from '@/utils/cloudBackup';
import { black, slate400, white } from '@/utils/colors';

const SaveRecoveryPhraseScreen: React.FC = () => {
  const [userHasSeenMnemonic, setUserHasSeenMnemonic] = useState(false);
  const { mnemonic, loadMnemonic } = useMnemonic();
  const { cloudBackupEnabled } = useSettingStore();
  const { isCompactWidth, isCompactHeight } = useCompactLayout({
    compactHeight: 780,
  });
  const isShortHeight = isCompactHeight;
  const topPadding = isShortHeight ? 12 : 20;
  const bottomPadding = isShortHeight ? 6 : 10;
  const sectionGap = isShortHeight ? 6 : 10;
  const titleStyle = useMemo(
    () => ({
      paddingTop: topPadding,
      textAlign: 'center',
      fontSize: isCompactWidth ? 26 : 28,
      lineHeight: isCompactWidth ? 32 : 35,
    }),
    [isCompactWidth, topPadding],
  );
  const descriptionStyle = useMemo(
    () => ({
      paddingBottom: bottomPadding,
      fontSize: isCompactWidth ? 16 : 18,
      lineHeight: isCompactWidth ? 21 : 23,
    }),
    [bottomPadding, isCompactWidth],
  );

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
        gap={sectionGap}
      >
        <Title style={titleStyle}>
          Save your recovery phrase
        </Title>
        <Description style={descriptionStyle}>
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
          You can reveal your recovery phrase in settings.
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
