import { ethers } from 'ethers';
import { useCallback, useState } from 'react';

import { useAuth } from '../stores/authProvider';

export default function useMnemonic(): {
  loadMnemonic: () => Promise<void>;
  mnemonic: string[] | undefined;
} {
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
