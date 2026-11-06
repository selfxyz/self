// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useRef } from 'react';
import { Modal, Platform, StyleSheet } from 'react-native';
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

// iOS reports the native dismissal through Modal's onDismiss; if that event
// never arrives, release waiters after this delay instead of hanging.
export const NATIVE_DISMISS_FALLBACK_MS = 1000;

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

export interface AlertModalParams {
  titleText: string;
  bodyText: string;
  buttonText: string;
  secondaryButtonText?: string;
  onButtonPress: (() => Promise<void>) | (() => void);
  onSecondaryButtonPress?: (() => Promise<void>) | (() => void);
  onModalDismiss?: () => void;
  /**
   * Runs once the modal has fully left the screen after being hidden (native
   * dismissal complete on iOS). Present native UI such as the Didit SDK from
   * here, never from a button handler, so it is not stacked on this modal.
   */
  onHidden?: () => void;
  preventDismiss?: boolean;
  disablePrimaryButton?: boolean;
}

interface AlertModalProps {
  visible: boolean;
  modalParams: AlertModalParams | null;
  onHideModal?: () => void;
  /** Host-level counterpart of `AlertModalParams.onHidden`. */
  onHidden?: () => void;
}

interface PendingHide {
  params: AlertModalParams | null;
  timer: ReturnType<typeof setTimeout> | null;
}

const AlertModal: React.FC<AlertModalProps> = ({
  visible,
  modalParams,
  onHideModal,
  onHidden,
}) => {
  const latestRef = useRef({ modalParams, onHidden });
  const pendingHideRef = useRef<PendingHide | null>(null);
  const wasVisibleRef = useRef(visible);

  useEffect(() => {
    latestRef.current = { modalParams, onHidden };
  });

  const finishHide = useCallback(() => {
    const pending = pendingHideRef.current;
    if (!pending) {
      return;
    }
    pendingHideRef.current = null;
    if (pending.timer) {
      clearTimeout(pending.timer);
    }
    pending.params?.onHidden?.();
    latestRef.current.onHidden?.();
  }, []);

  useEffect(() => {
    const wasVisible = wasVisibleRef.current;
    wasVisibleRef.current = visible;
    if (!wasVisible || visible) {
      return;
    }
    const pending: PendingHide = {
      params: latestRef.current.modalParams,
      timer: null,
    };
    pendingHideRef.current = pending;
    if (Platform.OS === 'ios') {
      pending.timer = setTimeout(finishHide, NATIVE_DISMISS_FALLBACK_MS);
    } else {
      finishHide();
    }
  }, [visible, finishHide]);

  useEffect(() => () => finishHide(), [finishHide]);

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
      onDismiss={finishHide}
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
              <PrimaryButton
                onPress={onButtonPressed}
                disabled={modalParams.disablePrimaryButton}
              >
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

export default AlertModal;
