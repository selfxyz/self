import React, { useCallback, useState } from 'react';
import { findBestLanguageTag } from 'react-native-localize';

import { ethers } from 'ethers';

import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import { Caption } from '../../components/typography/Caption';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { useAuth } from '../../stores/authProvider';
import { STORAGE_NAME } from '../../utils/cloudBackup';
import { black, slate400, white } from '../../utils/colors';
import React, { useCallback, useState } from 'react';
import { findBestLanguageTag } from 'react-native-localize';
import { YStack } from 'tamagui';

interface SaveRecoveryPhraseScreenProps {}

const SaveRecoveryPhraseScreen: React.FC<
  SaveRecoveryPhraseScreenProps
> = ({}) => {
  const { getOrCreatePrivateKey } = useAuth();
  const [mnemonic, setMnemonic] = useState<string[]>();
  const [userHasSeenMnemonic, setUserHasSeenMnemonic] = useState(false);

  const onRevealWords = useCallback(async () => {
    await loadMnemonic();
    setUserHasSeenMnemonic(true);
  }, []);

  const loadMnemonic = useCallback(async () => {
    const privKey = await getOrCreatePrivateKey();
    if (!privKey) {
      return;
    }

    const { languageTag } = findBestLanguageTag(
      Object.keys(ethers.wordlists),
    ) || { languageTag: 'en' };

    const words = ethers.Mnemonic.entropyToPhrase(
      privKey.data,
      ethers.wordlists[languageTag],
    );

    setMnemonic(words.trim().split(' '));
  }, []);

  const onCloudBackupPress = useHapticNavigation('CloudBackupSettings', {
    params: { nextScreen: 'AccountVerifiedSuccess' },
  });
  const onSkipPress = useHapticNavigation('AccountVerifiedSuccess');

  return (
    <ExpandableBottomLayout.Layout backgroundColor={black}>
      <ExpandableBottomLayout.TopSection
        roundTop
        backgroundColor={white}
        justifyContent="space-between"
        gap={10}
      >
        <Title paddingTop={20} textAlign="center">
          Save your recovery phrase
        </Title>
        <Description paddingBottom={10}>
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
        <Caption color={slate400}>
          You can reveal your recovery phrase in settings.
        </Caption>
        <PrimaryButton onPress={onCloudBackupPress}>
          Enable {STORAGE_NAME} backups
        </PrimaryButton>
        <SecondaryButton onPress={onSkipPress}>
          {userHasSeenMnemonic ? 'Continue' : 'Skip making a backup'}
        </SecondaryButton>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default SaveRecoveryPhraseScreen;
