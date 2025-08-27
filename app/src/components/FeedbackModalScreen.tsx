// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import { Modal, StyleSheet } from 'react-native';
import { Stack, styled, View } from 'tamagui';

import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { SecondaryButton } from '@/components/buttons/SecondaryButton';
import Description from '@/components/typography/Description';
import { Title } from '@/components/typography/Title';
import ModalClose from '@/images/icons/modal_close.svg';
import LogoInversed from '@/images/logo_inversed.svg';
import { white } from '@/utils/colors';
import { confirmTap, impactLight } from '@/utils/haptic';

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
          <Stack gap={40}>
            <Stack alignItems="center" justifyContent="space-between">
              <LogoInversed />
              {modalParams.preventDismiss ? null : (
                <ModalClose onPress={onClose} />
              )}
            </Stack>
            <Stack gap={20}>
              <Title textAlign="left">{modalParams.titleText}</Title>
              <Description style={styles.description}>
                {modalParams.bodyText}
              </Description>
            </Stack>
            <Stack gap={12}>
              <PrimaryButton onPress={onButtonPressed}>
                {modalParams.buttonText}
              </PrimaryButton>
              {modalParams.secondaryButtonText && (
                <SecondaryButton onPress={onSecondaryButtonPress}>
                  {modalParams.secondaryButtonText}
                </SecondaryButton>
              )}
            </Stack>
          </Stack>
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
