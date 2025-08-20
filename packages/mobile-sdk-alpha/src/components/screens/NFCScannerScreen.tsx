import { useCallback } from 'react';
import { Button, Text, YStack } from 'tamagui';

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
    <YStack space="$4" padding="$4">
      <Text fontSize="$6" fontWeight="bold">
        NFC Scanner
      </Text>
      <Button onPress={() => onNFCScan({})}>Simulate NFC Scan</Button>
    </YStack>
  );
};
