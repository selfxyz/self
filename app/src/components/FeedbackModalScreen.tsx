// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import { Modal, StyleSheet } from 'react-native';
import { styled, View, XStack, YStack } from 'tamagui';

import {
  Description,
  PrimaryButton,
  SecondaryButton,
  Title,
} from '@selfxyz/mobile-sdk-alpha/components';
import { white } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import ModalClose from '@/assets/icons/modal_close.svg';
import LogoInversed from '@/assets/images/logo_inversed.svg';
import { confirmTap, impactLight } from '@/integrations/haptics';

const ModalBackDrop = styled(View, {
  display: 'flex',
  alignItems: 'center',
  // TODO cannot use filter(blur), so increased opacity
  backgroundColor: '#000000BB',
  alignContent: 'center',
  alignSelf: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
});

export interface FeedbackModalScreenParams {
  titleText: string;
  bodyText: string;
  buttonText: string;
  secondaryButtonText?: string;
  onButtonPress: (() => Promise<void>) | (() => void);
  onSecondaryButtonPress?: (() => Promise<void>) | (() => void);
  onModalDismiss?: () => void;
  preventDismiss?: boolean;
}

interface FeedbackModalScreenProps {
  visible: boolean;
  modalParams: FeedbackModalScreenParams | null;
  onHideModal?: () => void;
}

const FeedbackModalScreen: React.FC<FeedbackModalScreenProps> = ({
  visible,
  modalParams,
  onHideModal,
}) => {
  const onButtonPressed = useCallback(async () => {
    confirmTap();

    if (!modalParams || !modalParams.onButtonPress) {
      console.warn('Modal params not found or onButtonPress not defined');
      return;
    }

    try {
      await modalParams.onButtonPress();
    } catch (callbackError) {
      console.error('Callback error:', callbackError);
    } finally {
      onHideModal?.();
    }
  }, [modalParams, onHideModal]);

  const onClose = useCallback(() => {
    impactLight();
    modalParams?.onModalDismiss?.();
    onHideModal?.();
  }, [modalParams, onHideModal]);

  const onSecondaryButtonPress = useCallback(async () => {
    if (!modalParams?.onSecondaryButtonPress) {
      return;
    }

    try {
      await modalParams.onSecondaryButtonPress();
    } catch (error) {
      console.error('Secondary button callback error:', error);
    } finally {
      onHideModal?.();
    }
  }, [modalParams, onHideModal]);

  if (!modalParams) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={modalParams.preventDismiss ? undefined : onClose}
    >
      <ModalBackDrop>
        <View
          backgroundColor={white}
          padding={20}
          borderRadius={10}
          marginHorizontal={8}
        >
          <YStack gap={40}>
            <XStack alignItems="center" justifyContent="space-between">
              <LogoInversed />
              {modalParams.preventDismiss ? null : (
                <ModalClose onPress={onClose} />
              )}
            </XStack>
            <YStack gap={20}>
              <Title style={{ textAlign: 'left' }}>
                {modalParams.titleText}
              </Title>
              <Description style={styles.description}>
                {modalParams.bodyText}
              </Description>
            </YStack>
            <YStack gap={12}>
              <PrimaryButton onPress={onButtonPressed}>
                {modalParams.buttonText}
              </PrimaryButton>
              {modalParams.secondaryButtonText && (
                <SecondaryButton onPress={onSecondaryButtonPress}>
                  {modalParams.secondaryButtonText}
                </SecondaryButton>
              )}
            </YStack>
          </YStack>
        </View>
      </ModalBackDrop>
    </Modal>
  );
};

const styles = StyleSheet.create({
  description: {
    textAlign: 'left',
  },
});

export default FeedbackModalScreen;
