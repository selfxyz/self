import React, { useCallback, useState } from 'react';
import { findBestLanguageTag } from 'react-native-localize';

import { ethers } from 'ethers';

import Mnemonic from '../../components/Mnemonic';
import Description from '../../components/typography/Description';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { useAuth } from '../../stores/authProvider';
import React, { useCallback, useState } from 'react';
import { findBestLanguageTag } from 'react-native-localize';
import { YStack } from 'tamagui';

interface ShowRecoveryPhraseScreenProps {}

const ShowRecoveryPhraseScreen: React.FC<
  ShowRecoveryPhraseScreenProps
> = ({}) => {
  const { getOrCreatePrivateKey } = useAuth();
  const [mnemonic, setMnemonic] = useState<string[]>();

  const onRevealWords = useCallback(async () => {
    await loadMnemonic();
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

  return (
    <ExpandableBottomLayout.Layout backgroundColor="white">
      <ExpandableBottomLayout.BottomSection
        backgroundColor="white"
        justifyContent="center"
        gap={20}
      >
        <Mnemonic words={mnemonic} onRevealWords={onRevealWords} />
        <Description>
          This phrase is the only way to recover your account. Keep it secret,
          keep it safe.
        </Description>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default ShowRecoveryPhraseScreen;
