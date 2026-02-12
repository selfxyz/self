import React, { useState } from 'react';
import { Text, View, YStack, XStack, ScrollView, Spinner } from 'tamagui';
import { useNavigate } from 'react-router-dom';

const black = '#000000';
const white = '#ffffff';
const amber50 = '#FFFBEB';
const slate300 = '#CBD5E1';
const slate400 = '#94A3B8';
const dinot = 'DINOT-Medium';

interface DisclosureItem {
  label: string;
  verified: boolean;
}

const DISCLOSURE_ITEMS: DisclosureItem[] = [
  { label: 'Full Name', verified: true },
  { label: 'Date of Birth', verified: true },
  { label: 'Nationality', verified: true },
  { label: 'Document Number', verified: false },
];

export const ProvingScreen: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    // Simulate proof generation delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    navigate('/proving/result', { state: { success: true } });
  };

  return (
    <YStack flex={1} backgroundColor={white}>
      {/* Header */}
      <XStack
        alignItems="center"
        paddingHorizontal={16}
        paddingVertical={12}
        gap={12}
      >
        <View
          pressStyle={{ opacity: 0.7 }}
          onPress={() => navigate(-1 as any)}
          cursor="pointer"
          padding={8}
        >
          <Text fontSize={20} color={black}>
            {'\u2190'}
          </Text>
        </View>
        <Text
          fontFamily={dinot}
          fontSize={20}
          fontWeight="500"
          color={black}
        >
          Verify Identity
        </Text>
      </XStack>

      {/* Scrollable content */}
      <ScrollView flex={1} paddingHorizontal={16}>
        <YStack gap={24} paddingBottom={120}>
          {/* App info card */}
          <XStack
            borderRadius={16}
            padding={16}
            borderWidth={1}
            borderColor={slate300}
            alignItems="center"
            gap={12}
          >
            <View
              width={40}
              height={40}
              borderRadius={10}
              backgroundColor="#EFF6FF"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize={20}>{'\u{1F512}'}</Text>
            </View>
            <YStack flex={1} gap={4}>
              <Text fontFamily={dinot} fontSize={16} fontWeight="500" color={black}>
                Requesting App
              </Text>
              <XStack
                backgroundColor="#ECFDF5"
                borderRadius={8}
                paddingHorizontal={8}
                paddingVertical={2}
                alignSelf="flex-start"
              >
                <Text fontFamily={dinot} fontSize={12} color="#16A34A">
                  Verified App
                </Text>
              </XStack>
            </YStack>
          </XStack>

          {/* Section title */}
          <Text
            fontFamily={dinot}
            fontSize={14}
            color={slate400}
            letterSpacing={1}
            textTransform="uppercase"
          >
            Data to share
          </Text>

          {/* Disclosure items */}
          <YStack gap={8}>
            {DISCLOSURE_ITEMS.map((item) => (
              <XStack
                key={item.label}
                backgroundColor={white}
                borderRadius={12}
                padding={16}
                borderWidth={1}
                borderColor="#F1F5F9"
                alignItems="center"
                justifyContent="space-between"
              >
                <Text fontFamily={dinot} fontSize={16} color={black}>
                  {item.label}
                </Text>
                <Text fontSize={16}>
                  {item.verified ? '\u2705' : '\u{1F512}'}
                </Text>
              </XStack>
            ))}
          </YStack>
        </YStack>
      </ScrollView>

      {/* Bottom fixed action */}
      <YStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        padding={16}
        paddingBottom={32}
        backgroundColor={white}
        borderTopWidth={1}
        borderTopColor="#F1F5F9"
      >
        <View
          backgroundColor={black}
          borderRadius={12}
          paddingVertical={16}
          alignItems="center"
          justifyContent="center"
          pressStyle={{ opacity: 0.8 }}
          onPress={loading ? undefined : handleVerify}
          cursor={loading ? 'default' : 'pointer'}
          opacity={loading ? 0.7 : 1}
        >
          {loading ? (
            <Spinner size="small" color={amber50} />
          ) : (
            <Text fontFamily={dinot} fontSize={16} fontWeight="500" color={amber50}>
              Slide to verify
            </Text>
          )}
        </View>
      </YStack>
    </YStack>
  );
};
