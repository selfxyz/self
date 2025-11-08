// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useEffect, useState } from 'react';
import { Button, Text, XStack, YStack } from 'tamagui';
import Clipboard from '@react-native-clipboard/clipboard';

import {
  black,
  slate50,
  slate200,
  teal500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import { confirmTap } from '@/integrations/haptics';
import { unsafe_getPrivateKey } from '@/providers/authProvider';

const DevPrivateKeyScreen: React.FC = () => {
  const [privateKey, setPrivateKey] = useState<string | null>(
    'Loading private key…',
  );
  const [isPrivateKeyRevealed, setIsPrivateKeyRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    unsafe_getPrivateKey().then(key =>
      setPrivateKey(key || 'No private key found'),
    );
  }, []);

  const handleRevealPrivateKey = useCallback(() => {
    confirmTap();
    if (!isPrivateKeyRevealed) {
      setIsPrivateKeyRevealed(true);
    }
    if (isPrivateKeyRevealed) {
      Clipboard.setString(privateKey || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [isPrivateKeyRevealed, privateKey]);

  const getRedactedPrivateKey = useCallback(() => {
    if (
      !privateKey ||
      privateKey === 'Loading private key…' ||
      privateKey === 'No private key found'
    ) {
      return privateKey;
    }

    // If it starts with 0x, show 0x followed by asterisks for the rest
    if (privateKey.startsWith('0x')) {
      const restLength = privateKey.length - 2;
      return '0x' + '*'.repeat(restLength);
    }

    // Otherwise, show asterisks for the entire length
    return '*'.repeat(privateKey.length);
  }, [privateKey]);

  return (
    <YStack padding="$4">
      <YStack position="relative" alignItems="stretch" gap={0}>
        <XStack
          borderColor={slate200}
          backgroundColor={slate50}
          borderWidth="$1"
          borderBottomWidth={0}
          borderTopLeftRadius="$5"
          borderTopRightRadius="$5"
          gap={12}
          paddingHorizontal={26}
          paddingVertical={28}
          flexWrap="wrap"
        >
          <Text>
            {isPrivateKeyRevealed ? privateKey : getRedactedPrivateKey()}
          </Text>
        </XStack>
        <XStack
          borderTopColor={slate200}
          borderTopWidth="$1"
          justifyContent="center"
          alignItems="stretch"
        >
          <Button
            unstyled
            color={isPrivateKeyRevealed ? (copied ? black : white) : black}
            borderColor={
              isPrivateKeyRevealed ? (copied ? teal500 : black) : slate200
            }
            backgroundColor={
              isPrivateKeyRevealed ? (copied ? teal500 : black) : slate50
            }
            borderWidth="$1"
            borderTopWidth={0}
            borderBottomLeftRadius="$5"
            borderBottomRightRadius="$5"
            paddingVertical="$2"
            onPress={handleRevealPrivateKey}
            width="100%"
            textAlign="center"
          >
            {isPrivateKeyRevealed
              ? `${copied ? 'COPIED' : 'COPY'} TO CLIPBOARD`
              : 'TAP TO REVEAL'}
          </Button>
        </XStack>
      </YStack>
    </YStack>
  );
};

export default DevPrivateKeyScreen;
