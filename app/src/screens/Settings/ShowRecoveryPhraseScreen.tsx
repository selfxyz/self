import React, { useCallback, useContext, useState } from 'react';
import { findBestLanguageTag } from 'react-native-localize';

import { ethers } from 'ethers';
import { YStack } from 'tamagui';

import Mnemonic from '../../components/Mnemonic';
import Description from '../../components/typography/Description';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { AuthContext } from '../../stores/authProvider';
import { loadSecretOrCreateIt } from '../../utils/keychain';

interface ShowRecoveryPhraseScreenProps {}

const ShowRecoveryPhraseScreen: React.FC<
  ShowRecoveryPhraseScreenProps
> = ({}) => {
  const { loginWithBiometrics } = useContext(AuthContext);
  const [mnemonic, setMnemonic] = useState<string[]>();

  const onRevealWords = useCallback(async () => {
    await loadMnemonic();
    await loginWithBiometrics();
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

  return (
    <ExpandableBottomLayout.Layout backgroundColor="white">
      <ExpandableBottomLayout.BottomSection backgroundColor="white">
        <YStack
          alignItems="center"
          height="100%"
          justifyContent="flex-start"
          pt="40%"
          gap="$10"
        >
          <Mnemonic words={mnemonic} onRevealWords={onRevealWords} />
          <Description>
            This phrase is the only way to recover your account. Keep it secret,
            keep it safe.
          </Description>
        </YStack>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default ShowRecoveryPhraseScreen;
