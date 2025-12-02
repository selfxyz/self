// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, XStack, YStack } from 'tamagui';

import { Caption } from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  slate400,
  white,
  zinc800,
  zinc900,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { advercase, dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (
    feedback: string,
    category: string,
    name?: string,
    email?: string,
  ) => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const [feedback, setFeedback] = useState('');
  const [category, setCategory] = useState('general');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { value: 'general', label: 'General Feedback' },
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'ui', label: 'UI/UX Issue' },
  ];

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      Alert.alert('Error', 'Please enter your feedback');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(
        feedback.trim(),
        category,
        name.trim() || undefined,
        email.trim() || undefined,
      );
      setFeedback('');
      setCategory('general');
      setName('');
      setEmail('');
      onClose();
      Alert.alert('Success', 'Thank you for your feedback!');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (feedback.trim() || name.trim() || email.trim()) {
      Alert.alert(
        'Discard Feedback?',
        'You have unsaved feedback. Are you sure you want to close?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onClose },
        ],
      );
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <YStack gap="$4" padding="$4">
            <XStack justifyContent="space-between" alignItems="center">
              <Text style={styles.title}>Send Feedback</Text>
              <Button
                size="$2"
                variant="outlined"
                onPress={handleClose}
                disabled={isSubmitting}
              >
                ✕
              </Button>
            </XStack>

            <YStack gap="$2">
              <Caption style={styles.label}>Category</Caption>
              <XStack gap="$2" flexWrap="wrap">
                {categories.map(cat => (
                  <Button
                    key={cat.value}
                    size="$2"
                    backgroundColor={
                      category === cat.value ? white : 'transparent'
                    }
                    color={category === cat.value ? black : white}
                    borderColor={white}
                    onPress={() => setCategory(cat.value)}
                    disabled={isSubmitting}
                  >
                    {cat.label}
                  </Button>
                ))}
              </XStack>
            </YStack>

            <YStack gap="$2">
              <Caption style={styles.label}>
                Contact Information (Optional)
              </Caption>
              <XStack gap="$2">
                <TextInput
                  style={[styles.textInput, { flex: 1, minHeight: 48 }]}
                  placeholder="Name"
                  placeholderTextColor={slate400}
                  value={name}
                  onChangeText={setName}
                  editable={!isSubmitting}
                />
                <TextInput
                  style={[styles.textInput, { flex: 1, minHeight: 48 }]}
                  placeholder="Email"
                  placeholderTextColor={slate400}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isSubmitting}
                />
              </XStack>
            </YStack>

            <YStack gap="$2">
              <Caption style={styles.label}>Your Feedback</Caption>
              <TextInput
                style={styles.textInput}
                placeholder="Tell us what you think, report a bug, or suggest a feature..."
                placeholderTextColor={slate400}
                value={feedback}
                onChangeText={setFeedback}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                editable={!isSubmitting}
              />
            </YStack>

            <Button
              size="$4"
              backgroundColor={white}
              color={black}
              onPress={handleSubmit}
              disabled={isSubmitting || !feedback.trim()}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
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
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: zinc800,
  },
  title: {
    fontFamily: advercase,
    fontSize: 24,
    fontWeight: '600',
    color: white,
  },
  label: {
    fontFamily: dinot,
    color: white,
    fontSize: 14,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: black,
    borderWidth: 1,
    borderColor: zinc800,
    borderRadius: 8,
    padding: 12,
    color: white,
    fontSize: 16,
    fontFamily: dinot,
    minHeight: 120,
  },
});

export default FeedbackModal;
