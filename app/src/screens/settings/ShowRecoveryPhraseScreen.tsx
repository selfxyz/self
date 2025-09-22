// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';

import Mnemonic from '@/components/Mnemonic';
import Description from '@/components/typography/Description';
import useMnemonic from '@/hooks/useMnemonic';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';

const ShowRecoveryPhraseScreen: React.FC = () => {
  const { mnemonic, loadMnemonic } = useMnemonic();

  const onRevealWords = useCallback(async () => {
    await loadMnemonic();
  }, [loadMnemonic]);

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
