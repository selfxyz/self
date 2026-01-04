// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useEffect, useRef, useState } from 'react';
// Sentry feedback widget APIs are unstable in our native setup.
// To avoid crashes (`_setVisibility` undefined), always use the custom modal
// and never call the native widget/button helpers.
// (captureFeedback still works; only the UI is swapped out.)

import type { FeedbackModalScreenParams } from '@/components/FeedbackModalScreen';
import { captureFeedback } from '@/config/sentry';

export type FeedbackType = 'button' | 'widget' | 'custom';

export const useFeedbackModal = () => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalParams, setModalParams] =
    useState<FeedbackModalScreenParams | null>(null);

  const showFeedbackModal = useCallback((type: FeedbackType = 'button') => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Always use our custom modal; never invoke Sentry's native feedback UI.
    setIsVisible(true);
  }, []);

  const hideFeedbackModal = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsVisible(false);
  }, []);

  const showModal = useCallback((params: FeedbackModalScreenParams) => {
    setModalParams(params);
    setIsModalVisible(true);
  }, []);

  const hideModal = useCallback(() => {
    setIsModalVisible(false);
    setModalParams(null);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  //used by the custom modal to submit feedback
  const submitFeedback = useCallback(
    async (
      feedback: string,
      category: string,
      name?: string,
      email?: string,
    ) => {
      try {
        captureFeedback(feedback, {
          category,
          source: 'feedback_modal',
          name,
          email,
          extra: {
            feedback,
            category,
            name,
            email,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('Failed to submit feedback:', error);
      }
    },
    [],
  );

  return {
    isVisible,
    showFeedbackModal,
    hideFeedbackModal,
    submitFeedback,
    isModalVisible,
    modalParams,
    showModal,
    hideModal,
  };
};
