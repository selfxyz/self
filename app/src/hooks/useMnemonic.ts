import { useCallback, useState } from 'react';

import { ethers } from 'ethers';

import { useAuth } from '../stores/authProvider';

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
  }, []);

  return {
    loadMnemonic,
    mnemonic,
  };
}
