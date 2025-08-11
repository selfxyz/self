// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { ethers } from 'ethers';
import { useCallback, useState } from 'react';

import { useAuth } from '@/providers/authProvider';

export default function useMnemonic() {
  const { getOrCreateMnemonic } = useAuth();
  const [mnemonic, setMnemonic] = useState<string[]>();

  const loadMnemonic = useCallback(async () => {
    const storedMnemonic = await getOrCreateMnemonic();
    if (!storedMnemonic) {
      return;
    }
    const { entropy } = storedMnemonic.data;
    setMnemonic(ethers.Mnemonic.fromEntropy(entropy).phrase.split(' '));
  }, [getOrCreateMnemonic]);

  return {
    loadMnemonic,
    mnemonic,
  };
}
