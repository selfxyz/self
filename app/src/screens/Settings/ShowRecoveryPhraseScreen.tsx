import React, { useCallback, useContext, useState } from 'react';
import { findBestLanguageTag } from 'react-native-localize';

import { ethers } from 'ethers';
import { YStack } from 'tamagui';

import Mnemonic from '../../components/Mnemonic';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import { Caption } from '../../components/typography/Caption';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { AuthContext } from '../../stores/authProvider';
import { slate400 } from '../../utils/colors';
import { loadSecretOrCreateIt } from '../../utils/keychain';

interface ShowRecoveryPhraseScreenProps {}

const ShowRecoveryPhraseScreen: React.FC<
  ShowRecoveryPhraseScreenProps
> = ({}) => {
  const { loginWithBiometrics } = useContext(AuthContext);
  const [mnemonic, setMnemonic] = useState<string[]>();
  const [userHasSeenMnemonic, setUserHasSeenMnemonic] = useState(false);

  const onRevealWords = useCallback(async () => {
    await loadMnemonic();
    await loginWithBiometrics();
    setUserHasSeenMnemonic(true);
  }, []);

  const loadMnemonic = useCallback(async () => {
    const privKey = await loadSecretOrCreateIt();

    const { languageTag } = findBestLanguageTag(
      Object.keys(ethers.wordlists),
    ) || { languageTag: 'en' };

    const words = ethers.Mnemonic.entropyToPhrase(
      privKey,
      ethers.wordlists[languageTag],
    );

    setMnemonic(words.trim().split(' '));
  }, []);

  const onCloudBackupPress = useHapticNavigation('TODO: cloud backup');
  const onSkipPress = useHapticNavigation('AccountVerifiedSuccess');

  return (
    <ExpandableBottomLayout.Layout>
      <ExpandableBottomLayout.BottomSection>
        <YStack
          alignItems="center"
          gap="$2.5"
          pb="$2.5"
          height="100%"
          justifyContent="flex-end"
        >
          <Title>Save your recovery phrase</Title>
          <Description>
            This phrase is the only way to recover your account. Keep it secret,
            keep it safe.
          </Description>
          <Mnemonic words={mnemonic} onRevealWords={onRevealWords} />
          <YStack gap="$2.5" width="100%" pt="$6" alignItems="center">
            <Caption color={slate400}>
              You can reveal your recovery phrase in settings.
            </Caption>
            <PrimaryButton onPress={onCloudBackupPress}>
              Enable iCloud Back up
            </PrimaryButton>
            <SecondaryButton onPress={onSkipPress}>
              {userHasSeenMnemonic ? 'Continue' : 'Skip making a back up'}
            </SecondaryButton>
          </YStack>
        </YStack>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default ShowRecoveryPhraseScreen;
