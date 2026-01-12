// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { advercase } from '@selfxyz/mobile-sdk-alpha';
import { BodyText, PrimaryButton } from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  slate100,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';
import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks';

import CircleIcon from '@/assets/icons/circle.svg';
import { useAadhaarNameOptions } from '@/hooks/useAadhaarNameOptions';
import { useAadhaarNameSelected } from '@/hooks/useAadhaarNameSelected';
import type { RootStackParamList } from '@/navigation';
import { extraYPadding } from '@/utils/styleUtils';

const AadhaarFirstNameChooserScreen: React.FC = () => {
  const paddingBottom = useSafeBottomPadding(extraYPadding + 35);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { loading: isLoading, nameParts: nameOptions } =
    useAadhaarNameOptions(navigation);

  const onSelectedFirstName = useAadhaarNameSelected({
    nameOptions,
    part: 'first',
  });

  if (isLoading) {
    return (
      <YStack style={styles.loadingContainer}>
        <BodyText style={styles.loadingText}>Loading Aadhaar data...</BodyText>
      </YStack>
    );
  }

  return (
    <YStack style={styles.container}>
      <BodyText style={styles.title}>Select your first name</BodyText>
      <BodyText style={styles.subtitle}>
        To identify you correctly, please select your{' '}
        <BodyText style={styles.subtitleEmphasis}>first name</BodyText> from the
        list below.
      </BodyText>

      <YStack style={styles.sectionWrapper}>
        <BodyText style={styles.sectionLabel}>My first name is:</BodyText>
        <YStack gap={0} style={styles.optionsList}>
          {nameOptions.map((name, index) => (
            <Pressable
              key={`name-option-${index}`}
              style={({ pressed }) => [
                styles.nameOptionRow,
                pressed && styles.nameOptionPressed,
              ]}
              onPress={() => onSelectedFirstName(index)}
            >
              <CircleIcon />
              <BodyText style={[styles.nameLabel]}>{name}</BodyText>
            </Pressable>
          ))}
        </YStack>
      </YStack>

      <YStack style={[styles.bottomBar, { paddingBottom }]}>
        <PrimaryButton disabled={true}>
          Select first name to continue
        </PrimaryButton>
      </YStack>
    </YStack>
  );
};

export default AadhaarFirstNameChooserScreen;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: slate100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: slate500,
  },
  container: {
    flex: 1,
    backgroundColor: slate100, // or original
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '400',
    color: black,
    fontFamily: advercase,
    lineHeight: 34,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: slate500,
    fontFamily: dinot,
    lineHeight: 24,
    marginBottom: 32,
  },
  subtitleEmphasis: {
    fontSize: 17,
    color: black,
    fontWeight: '600',
    fontFamily: dinot,
  },
  sectionWrapper: {
    width: '100%',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: slate500,
    letterSpacing: 0.6,
    marginBottom: 16,
    fontFamily: dinot,
    textTransform: 'uppercase',
  },
  optionsList: {
    width: '100%',
  },
  nameOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
    width: 250,
    justifyContent: 'flex-start',
  },
  nameOptionPressed: {
    backgroundColor: slate100,
  },
  nameLabel: {
    fontSize: 18,
    color: black,
    fontWeight: '500',
    fontFamily: dinot,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: white,
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
});
