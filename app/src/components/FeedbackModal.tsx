// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button, XStack, YStack } from 'tamagui';

import { Caption } from '@selfxyz/mobile-sdk-alpha/components';
import {
  white,
  zinc800,
  zinc900,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { advercase, dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import ModalClose from '@/assets/icons/modal_close.svg';
import { openSupportForm } from '@/services/support';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit?: (
    feedback: string,
    category: string,
    name?: string,
    email?: string,
  ) => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ visible, onClose }) => {
  const handleSupportForm = async () => {
    await openSupportForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <YStack gap="$4" padding="$4">
            <XStack justifyContent="space-between" alignItems="center">
              <Text style={styles.title}>Get Help</Text>
              <ModalClose onPress={onClose} />
            </XStack>

            <YStack gap="$3" alignItems="center" paddingVertical="$2">
              <Caption style={styles.messageText}>
                Have questions, feedback, or running into issues?
              </Caption>
              <Caption style={styles.messageText}>
                Fill out our tech support form and we'll get back to you as soon
                as possible.
              </Caption>
            </YStack>

            <Button
              size="$4"
              backgroundColor={white}
              color="$black"
              onPress={handleSupportForm}
            >
              Open Support Form
            </Button>
          </YStack>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: zinc900,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: zinc800,
  },
  title: {
    fontFamily: advercase,
    fontSize: 24,
    fontWeight: '600',
    color: white,
  },
  messageText: {
    fontFamily: dinot,
    color: white,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default FeedbackModal;
