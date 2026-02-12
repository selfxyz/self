import React from 'react';
import { Text, YStack, Button } from 'tamagui';
import { useNavigate } from 'react-router-dom';

import {
  black,
  slate300,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

export const ComingSoonScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <YStack
      backgroundColor="#F8FAFC"
      flex={1}
      justifyContent="center"
      alignItems="center"
      paddingHorizontal={40}
      gap={24}
    >
      <Text
        fontFamily={dinot}
        fontSize={24}
        fontWeight="500"
        color={black}
        textAlign="center"
      >
        Coming Soon
      </Text>
      <Text
        fontFamily={dinot}
        fontSize={16}
        fontWeight="500"
        color={slate500}
        textAlign="center"
      >
        This feature is currently under development. Check back soon for
        updates.
      </Text>
      <Button
        backgroundColor={white}
        borderRadius={12}
        borderWidth={1}
        borderColor={slate300}
        paddingVertical={14}
        paddingHorizontal={32}
        pressStyle={{ opacity: 0.8 }}
        onPress={() => navigate(-1 as never)}
      >
        <Text
          fontFamily={dinot}
          fontSize={16}
          fontWeight="500"
          color={black}
          textAlign="center"
        >
          Go back
        </Text>
      </Button>
    </YStack>
  );
};
