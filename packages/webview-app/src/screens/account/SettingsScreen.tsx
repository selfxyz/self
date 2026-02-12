import React from 'react';
import { Text, YStack, XStack, ScrollView } from 'tamagui';
import { useNavigate } from 'react-router-dom';

import {
  black,
  slate300,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

const red600 = '#DC2626';

interface SettingsRowProps {
  label: string;
  value?: string;
  danger?: boolean;
  onPress?: () => void;
  isLast?: boolean;
}

const SettingsRow: React.FC<SettingsRowProps> = ({
  label,
  value,
  danger = false,
  onPress,
  isLast = false,
}) => (
  <XStack
    paddingVertical={16}
    paddingHorizontal={16}
    justifyContent="space-between"
    alignItems="center"
    borderBottomWidth={isLast ? 0 : 1}
    borderBottomColor="#F1F5F9"
    pressStyle={{ opacity: 0.7 }}
    onPress={onPress}
    cursor={onPress ? 'pointer' : undefined}
  >
    <Text
      fontFamily={dinot}
      fontSize={16}
      fontWeight="500"
      color={danger ? red600 : black}
    >
      {label}
    </Text>
    <XStack alignItems="center" gap={8}>
      {value && (
        <Text
          fontFamily={dinot}
          fontSize={14}
          fontWeight="500"
          color={slate500}
        >
          {value}
        </Text>
      )}
      {onPress && (
        <Text
          fontFamily={dinot}
          fontSize={16}
          color={slate300}
        >
          {'>'}
        </Text>
      )}
    </XStack>
  </XStack>
);

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <YStack gap={8}>
    <Text
      fontFamily={dinot}
      fontSize={13}
      fontWeight="500"
      color={slate500}
      textTransform="uppercase"
      paddingHorizontal={4}
    >
      {title}
    </Text>
    <YStack
      backgroundColor={white}
      borderRadius={16}
      elevation={2}
      overflow="hidden"
    >
      {children}
    </YStack>
  </YStack>
);

export const SettingsScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <YStack backgroundColor="#F8FAFC" flex={1}>
      {/* Header */}
      <XStack
        paddingHorizontal={16}
        paddingVertical={16}
        alignItems="center"
        gap={12}
      >
        <Text
          fontFamily={dinot}
          fontSize={24}
          fontWeight="500"
          color={black}
          pressStyle={{ opacity: 0.7 }}
          onPress={() => navigate(-1 as never)}
          cursor="pointer"
        >
          {'<-'}
        </Text>
        <Text
          fontFamily={dinot}
          fontSize={20}
          fontWeight="500"
          color={black}
        >
          Settings
        </Text>
      </XStack>

      {/* Content */}
      <ScrollView
        flex={1}
        contentContainerStyle={{
          gap: 24,
          paddingHorizontal: 16,
          paddingVertical: 8,
          paddingBottom: 40,
        }}
      >
        {/* Account section */}
        <Section title="Account">
          <SettingsRow
            label="Recovery Phrase"
            onPress={() => navigate('/coming-soon')}
          />
          <SettingsRow
            label="Cloud Backup"
            onPress={() => navigate('/coming-soon')}
            isLast
          />
        </Section>

        {/* About section */}
        <Section title="About">
          <SettingsRow
            label="Version"
            value="0.0.1-alpha.1"
          />
          <SettingsRow
            label="Terms of Service"
            onPress={() => navigate('/coming-soon')}
            isLast
          />
        </Section>

        {/* Danger Zone section */}
        <Section title="Danger Zone">
          <SettingsRow
            label="Delete Account"
            danger
            onPress={() => navigate('/coming-soon')}
            isLast
          />
        </Section>
      </ScrollView>
    </YStack>
  );
};
