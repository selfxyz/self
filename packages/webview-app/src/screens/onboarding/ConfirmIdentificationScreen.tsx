import React from 'react';
import { Text, View, YStack } from 'tamagui';
import { useNavigate } from 'react-router-dom';

const black = '#000000';
const white = '#ffffff';
const amber50 = '#FFFBEB';
const slate300 = '#CBD5E1';
const slate500 = '#64748B';
const dinot = 'DINOT-Medium';

export const ConfirmIdentificationScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <YStack flex={1}>
      {/* Top section — black with green checkmark */}
      <View
        flex={1}
        backgroundColor={black}
        alignItems="center"
        justifyContent="center"
      >
        <View
          width={120}
          height={120}
          borderRadius={60}
          backgroundColor="#22C55E"
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize={56} color={white}>
            {'\u2713'}
          </Text>
        </View>
      </View>

      {/* Bottom section — white content */}
      <YStack
        backgroundColor={white}
        padding={24}
        borderTopLeftRadius={24}
        borderTopRightRadius={24}
        gap={16}
        marginTop={-24}
        zIndex={1}
      >
        <Text
          fontFamily={dinot}
          fontSize={24}
          fontWeight="500"
          color={black}
          textAlign="center"
        >
          Document verified
        </Text>
        <Text
          fontFamily={dinot}
          fontSize={16}
          color={slate500}
          textAlign="center"
          lineHeight={22}
        >
          Your identity document has been successfully read. Please confirm this
          is your document.
        </Text>

        {/* Caution text */}
        <Text
          fontFamily={dinot}
          fontSize={14}
          color="#DC2626"
          textAlign="center"
          lineHeight={20}
        >
          By confirming, you certify that this document belongs to you.
        </Text>

        {/* Confirm button */}
        <View
          backgroundColor={black}
          borderRadius={12}
          paddingVertical={14}
          alignItems="center"
          pressStyle={{ opacity: 0.8 }}
          onPress={() => navigate('/')}
          cursor="pointer"
        >
          <Text fontFamily={dinot} fontSize={16} fontWeight="500" color={amber50}>
            Confirm
          </Text>
        </View>

        {/* Cancel button */}
        <View
          backgroundColor={white}
          borderRadius={12}
          paddingVertical={14}
          borderWidth={1}
          borderColor={slate300}
          alignItems="center"
          pressStyle={{ opacity: 0.7 }}
          onPress={() => navigate(-1 as any)}
          cursor="pointer"
        >
          <Text fontFamily={dinot} fontSize={16} fontWeight="500" color={black}>
            Cancel
          </Text>
        </View>
      </YStack>
    </YStack>
  );
};
