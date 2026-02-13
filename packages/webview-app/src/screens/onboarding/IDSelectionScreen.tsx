import React from 'react';
import { Text, View, YStack, XStack } from 'tamagui';
import { useNavigate } from 'react-router-dom';

const black = '#000000';
const white = '#ffffff';
const slate500 = '#64748B';
const blue600 = '#2563EB';
const dinot = 'DINOT-Medium';

export const IDSelectionScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <YStack flex={1}>
      {/* Top section — black with illustration */}
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
          backgroundColor={white}
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize={48}>{'\u{1F6C2}'}</Text>
        </View>
      </View>

      {/* Bottom section — white content area */}
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
          Choose your document
        </Text>
        <Text
          fontFamily={dinot}
          fontSize={16}
          color={slate500}
          textAlign="center"
          lineHeight={22}
        >
          Select the type of identity document you want to register
        </Text>

        {/* Passport card */}
        <XStack
          backgroundColor={white}
          borderRadius={16}
          padding={20}
          gap={16}
          alignItems="center"
          elevation={2}
          pressStyle={{ opacity: 0.8 }}
          onPress={() => navigate('/onboarding/camera')}
          cursor="pointer"
        >
          <View
            width={48}
            height={48}
            borderRadius={12}
            backgroundColor="#EFF6FF"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize={24}>{'\u{1F6C2}'}</Text>
          </View>
          <YStack flex={1} gap={6}>
            <Text fontFamily={dinot} fontSize={18} fontWeight="500" color={black}>
              Passport
            </Text>
            <XStack
              backgroundColor="#EFF6FF"
              borderRadius={8}
              paddingHorizontal={8}
              paddingVertical={4}
              alignSelf="flex-start"
            >
              <Text fontFamily={dinot} fontSize={12} color={blue600}>
                Best security
              </Text>
            </XStack>
          </YStack>
        </XStack>

        {/* ID Card */}
        <XStack
          backgroundColor={white}
          borderRadius={16}
          padding={20}
          gap={16}
          alignItems="center"
          elevation={2}
          pressStyle={{ opacity: 0.8 }}
          onPress={() => navigate('/onboarding/camera')}
          cursor="pointer"
        >
          <View
            width={48}
            height={48}
            borderRadius={12}
            backgroundColor="#EFF6FF"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize={24}>{'\u{1FAAA}'}</Text>
          </View>
          <YStack flex={1} gap={6}>
            <Text fontFamily={dinot} fontSize={18} fontWeight="500" color={black}>
              ID Card
            </Text>
            <XStack
              backgroundColor="#EFF6FF"
              borderRadius={8}
              paddingHorizontal={8}
              paddingVertical={4}
              alignSelf="flex-start"
            >
              <Text fontFamily={dinot} fontSize={12} color={blue600}>
                Quick scan
              </Text>
            </XStack>
          </YStack>
        </XStack>

        {/* Back button */}
        <View
          backgroundColor={white}
          borderRadius={12}
          paddingVertical={14}
          borderWidth={1}
          borderColor="#CBD5E1"
          alignItems="center"
          pressStyle={{ opacity: 0.7 }}
          onPress={() => navigate(-1 as any)}
          cursor="pointer"
        >
          <Text fontFamily={dinot} fontSize={16} fontWeight="500" color={black}>
            Back
          </Text>
        </View>
      </YStack>
    </YStack>
  );
};
