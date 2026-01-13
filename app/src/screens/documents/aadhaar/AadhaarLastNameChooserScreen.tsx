// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Pressable } from 'react-native';
import { YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BodyText, PrimaryButton } from '@selfxyz/mobile-sdk-alpha/components';
import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks';

import CircleIcon from '@/assets/icons/circle.svg';
import { useAadhaarNameOptions } from '@/hooks/useAadhaarNameOptions';
import { useAadhaarNameSelected } from '@/hooks/useAadhaarNameSelected';
import type { RootStackParamList } from '@/navigation';
import { extraYPadding } from '@/utils/styleUtils';

import { aadhaarNameStyles } from './aadhaarNameStyles';

const AadhaarLastNameChooserScreen: React.FC = () => {
  const paddingBottom = useSafeBottomPadding(extraYPadding + 35);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const {
    loading: isLoading,
    nameParts: nameOptions,
    firstNameIndex,
  } = useAadhaarNameOptions(navigation);

  const onSelectedLastName = useAadhaarNameSelected({
    nameOptions,
    part: 'last',
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
      <BodyText style={styles.title}>Next, select your last name</BodyText>
      <BodyText style={styles.subtitle}>
        To identify you correctly, please select your{' '}
        <BodyText style={styles.subtitleEmphasis}>last name</BodyText> from the
        list below.
      </BodyText>

      <YStack style={styles.sectionWrapper}>
        <BodyText style={styles.sectionLabel}>My first name is:</BodyText>
        <YStack gap={0} style={styles.optionsList}>
          <BodyText style={styles.nameLabel}>
            {nameOptions[firstNameIndex]}
          </BodyText>
        </YStack>
      </YStack>

      <YStack style={styles.sectionWrapper}>
        <BodyText style={styles.sectionLabel}>My last name is:</BodyText>
        <YStack gap={0} style={styles.optionsList}>
          {nameOptions.map((name, index) =>
            index === firstNameIndex ? null : (
              <Pressable
                key={`name-option-${index}`}
                style={({ pressed }) => [
                  styles.nameOptionRow,
                  pressed && styles.nameOptionPressed,
                ]}
                onPress={() => onSelectedLastName(index)}
              >
                <CircleIcon />
                <BodyText style={[styles.nameLabel]}>{name}</BodyText>
              </Pressable>
            ),
          )}
        </YStack>
      </YStack>

      <YStack style={[styles.bottomBar, { paddingBottom }]}>
        <PrimaryButton disabled={true}>
          Select last name to continue
        </PrimaryButton>
      </YStack>
    </YStack>
  );
};

export default AadhaarLastNameChooserScreen;

const styles = aadhaarNameStyles;
