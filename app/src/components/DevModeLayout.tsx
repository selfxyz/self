import React from 'react';
import { YStack, Text } from 'tamagui';

interface DevModeLayoutProps {
  children: React.ReactNode;
}

export const DevModeLayout: React.FC<DevModeLayoutProps> = ({ children }) => {
  const isDevMode = true;

  return (
    <YStack flex={1}>
      {isDevMode && (
        <YStack
          bg="$red10"
          p="$2"
          width="100%"
          height={32}
          ai="center"
          position="absolute"
          top={0}
          left={0}
          right={0}
          zIndex={999999}
        >
          <Text color="white" fontWeight="bold">
            ⚠️ Developer Mode Enabled
          </Text>
        </YStack>
      )}
      <YStack flex={1} pt={isDevMode ? 32 : 0}>
        {children}
      </YStack>
    </YStack>
  );
};
