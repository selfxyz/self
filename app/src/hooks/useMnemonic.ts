// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

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
