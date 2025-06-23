//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import React, { useCallback } from 'react';

import Mnemonic from '../../components/Mnemonic';
import Description from '../../components/typography/Description';
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
