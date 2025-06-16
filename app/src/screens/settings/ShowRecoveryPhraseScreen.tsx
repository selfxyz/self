import Mnemonic from '@selfxyz/ui/dist/components/Mnemonic';
import Description from '@selfxyz/ui/dist/typography/Description';
import React, { useCallback } from 'react';

import useMnemonic from '../../hooks/useMnemonic';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';

interface ShowRecoveryPhraseScreenProps {}

const ShowRecoveryPhraseScreen: React.FC<
  ShowRecoveryPhraseScreenProps
> = ({}) => {
  const { mnemonic, loadMnemonic } = useMnemonic();

  const onRevealWords = useCallback(async () => {
    await loadMnemonic();
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
