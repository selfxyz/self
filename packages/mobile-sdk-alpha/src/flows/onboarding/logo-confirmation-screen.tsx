// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { BodyText, PrimaryButton, SecondaryButton, View, YStack } from '../../components';
import ButtonsContainer from '../../components/ButtonsContainer';
import { black, slate400, white } from '../../constants/colors';
import { advercase, dinot } from '../../constants/fonts';
import { useSelfClient } from '../../context';
import { buttonTap } from '../../haptic';
import { SdkEvents } from '../../types/events';

type LogoConfirmationScreenProps = {
  documentType: string;
  countryCode: string;
  logo: ReactNode;
  onConfirm?: () => void;
  onNotFound?: () => void;
};

const LogoConfirmationScreen: React.FC<LogoConfirmationScreenProps> = ({
  documentType,
  countryCode,
  logo,
  onConfirm,
  onNotFound,
}) => {
  const selfClient = useSelfClient();

  const onYesPress = () => {
    buttonTap();
    if (onConfirm) {
      onConfirm();
    } else {
      selfClient.emit(SdkEvents.LOGO_CONFIRMED, { documentType, countryCode });
    }
  };

  const onNoPress = () => {
    buttonTap();
    if (onNotFound) {
      onNotFound();
    } else {
      selfClient.emit(SdkEvents.LOGO_NOT_FOUND, { documentType, countryCode });
    }
  };

  return (
    <YStack flex={1} paddingHorizontal="$4" justifyContent="center" alignItems="center">
      <YStack alignItems="center" gap="$6" maxWidth={340}>
        <BodyText style={styles.titleText}>
          Does your document have this symbol?
        </BodyText>

        <View style={styles.logoContainer}>
          {logo}
        </View>

        <BodyText style={styles.descriptionText}>
          This symbol indicates your document has a biometric chip, which is required for registration.
        </BodyText>

        <ButtonsContainer>
          <PrimaryButton onPress={onYesPress}>Yes</PrimaryButton>
          <SecondaryButton onPress={onNoPress}>No</SecondaryButton>
        </ButtonsContainer>
      </YStack>
    </YStack>
  );
};

const styles = StyleSheet.create({
  titleText: {
    fontSize: 20,
    fontFamily: advercase,
    textAlign: 'center',
    color: black,
  },
  logoContainer: {
    backgroundColor: white,
    borderRadius: 16,
    padding: 24,
    shadowColor: black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  descriptionText: {
    fontSize: 16,
    fontFamily: dinot,
    textAlign: 'center',
    color: slate400,
  },
});

export default LogoConfirmationScreen;
