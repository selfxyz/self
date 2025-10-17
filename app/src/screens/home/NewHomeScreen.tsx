// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, ScrollView, Text, XStack, YStack } from 'tamagui';
import { ChevronRight } from '@tamagui/lucide-icons';

import { extraYPadding } from '@/utils/constants';
import { dinot, plexMono } from '@/utils/fonts';

const cardShadow = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.08,
  shadowRadius: 20,
  elevation: 6,
};

const badgeShadow = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 10,
  elevation: 3,
};

const NewHomeScreen: React.FC = () => {
  const { bottom } = useSafeAreaInsets();

  return (
    <YStack
      flex={1}
      backgroundColor="#F8FAFC"
      paddingBottom={bottom + extraYPadding}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        flex={1}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 24,
          gap: 20,
        }}
      >
        <YStack
          borderRadius={28}
          padding={24}
          backgroundColor="#0F172A"
          {...cardShadow}
          gap={24}
        >
          <XStack justifyContent="space-between" alignItems="flex-start">
            <XStack alignItems="center" gap={12}>
              <YStack
                width={48}
                height={48}
                borderRadius={16}
                backgroundColor="rgba(59, 130, 246, 0.18)"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize={24}>🇪🇺</Text>
              </YStack>

              <YStack gap={2}>
                <Text fontFamily={dinot} fontSize={18} color="#F8FAFC">
                  EU ID
                </Text>
                <Text
                  fontFamily={plexMono}
                  fontSize={12}
                  color="rgba(226, 232, 240, 0.65)"
                >
                  VERIFIED EU ID
                </Text>
              </YStack>
            </XStack>

            <YStack alignItems="flex-end" gap={6}>
              <YStack
                paddingHorizontal={14}
                paddingVertical={6}
                borderRadius={999}
                backgroundColor="rgba(59, 130, 246, 0.16)"
                {...badgeShadow}
              >
                <Text
                  fontFamily={plexMono}
                  fontSize={11}
                  color="#38BDF8"
                  letterSpacing={1}
                >
                  VERIFIED
                </Text>
              </YStack>
              <Text fontFamily={plexMono} fontSize={12} color="#CBD5F5">
                EU • DIGITAL IDENTITY
              </Text>
            </YStack>
          </XStack>

          <YStack gap={18}>
            <YStack gap={6}>
              <Text fontFamily={dinot} fontSize={32} color="#F8FAFC">
                EU ID
              </Text>
              <Text
                fontFamily={dinot}
                fontSize={15}
                color="rgba(226, 232, 240, 0.7)"
              >
                Verified EU ID
              </Text>
            </YStack>

            <YStack
              height={160}
              borderRadius={20}
              backgroundColor="rgba(30, 41, 59, 0.75)"
              borderWidth={1}
              borderColor="rgba(59, 130, 246, 0.35)"
              alignItems="center"
              justifyContent="center"
              overflow="hidden"
            >
              <YStack alignItems="center" gap={8}>
                <Text fontFamily={plexMono} fontSize={12} color="#38BDF8">
                  DIGITAL ID PREVIEW
                </Text>
                <Text
                  fontFamily={plexMono}
                  fontSize={11}
                  color="rgba(226, 232, 240, 0.65)"
                >
                  Static placeholder design
                </Text>
              </YStack>
            </YStack>
          </YStack>
        </YStack>

        <YStack gap={16}>
          <YStack
            borderRadius={24}
            padding={20}
            backgroundColor="#FFFFFF"
            borderWidth={1}
            borderColor="#E2E8F0"
            {...cardShadow}
            gap={12}
          >
            <XStack alignItems="center" gap={12}>
              <YStack
                width={48}
                height={48}
                borderRadius={16}
                backgroundColor="#F1F5F9"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize={24}>🇳🇬</Text>
              </YStack>

              <YStack gap={4}>
                <Text fontFamily={dinot} fontSize={16} color="#0F172A">
                  NIGERIAN NATIONAL ID
                </Text>
                <Text
                  fontFamily={plexMono}
                  fontSize={12}
                  color="#475569"
                >
                  VERIFIED NIGERIAN IDENTITY CARD
                </Text>
              </YStack>
            </XStack>

            <YStack gap={8}>
              <Text fontFamily={dinot} fontSize={14} color="#1E293B">
                Nigeria • Digital identity card
              </Text>
              <Text
                fontFamily={plexMono}
                fontSize={12}
                color="#64748B"
              >
                Static preview with placeholder details for the national ID.
              </Text>
            </YStack>
          </YStack>

          <YStack
            borderRadius={24}
            padding={20}
            backgroundColor="#0EA5E9"
            {...cardShadow}
            gap={12}
          >
            <XStack alignItems="center" gap={12}>
              <YStack
                width={48}
                height={48}
                borderRadius={16}
                backgroundColor="rgba(255,255,255,0.18)"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize={24}>☁️</Text>
              </YStack>

              <YStack gap={4}>
                <Text fontFamily={dinot} fontSize={16} color="#F8FAFC">
                  Backup your account
                </Text>
                <Text
                  fontFamily={plexMono}
                  fontSize={12}
                  color="rgba(241, 245, 249, 0.8)"
                >
                  Enable iCloud backup
                </Text>
              </YStack>

              <XStack marginLeft="auto" alignItems="center">
                <ChevronRight color="#F8FAFC" size={20} />
              </XStack>
            </XStack>

            <Text fontFamily={dinot} fontSize={13} color="rgba(241, 245, 249, 0.9)">
              Secure your identity by saving a copy to your iCloud account.
            </Text>
          </YStack>
        </YStack>

        <YStack
          borderRadius={28}
          padding={24}
          backgroundColor="#FFFFFF"
          {...cardShadow}
          gap={20}
        >
          <YStack gap={8}>
            <Text fontFamily={dinot} fontSize={26} color="#0F172A">
              312 SELF POINTS
            </Text>
            <Text
              fontFamily={dinot}
              fontSize={14}
              color="#475569"
            >
              Earn points by referring friends, disclosing proof requests, and more.
            </Text>
          </YStack>

          <Button
            borderRadius={999}
            paddingHorizontal={20}
            paddingVertical={14}
            alignSelf="flex-start"
            backgroundColor="#0F172A"
            pressStyle={{ opacity: 0.85 }}
          >
            <Text fontFamily={dinot} fontSize={15} color="#F8FAFC">
              Earn points
            </Text>
          </Button>
        </YStack>
      </ScrollView>
    </YStack>
  );
};

export default NewHomeScreen;
