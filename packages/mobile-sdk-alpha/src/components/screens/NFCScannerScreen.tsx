import { useCallback } from 'react';

import { useSelfClient } from '../../context';
import type { ScreenProps } from '../../types/ui';

export const NFCScannerScreen = ({ onSuccess, onFailure }: ScreenProps) => {
  const client = useSelfClient();

  const onNFCScan = useCallback(
    async (_nfcData: any) => {
      try {
        // scan the document
        // register the document
        onSuccess();
      } catch (error) {
        onFailure(error as Error);
      }
    },
    [client, onSuccess, onFailure],
  );

  return (
    <div>
      <p>NFC Scanner</p>
      <button onClick={() => onNFCScan({})}>Simulate NFC Scan</button>
    </div>
  );
};
