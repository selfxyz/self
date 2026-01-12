// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  hideFeedbackButton,
  showFeedbackButton,
  showFeedbackWidget,
} from '@sentry/react-native';

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

    try {
      switch (type) {
        case 'button':
          showFeedbackButton();
          break;
        case 'widget':
          showFeedbackWidget();
          break;
        case 'custom':
          setIsVisible(true);
          break;
        default:
          showFeedbackButton();
      }
    } catch (error) {
      if (__DEV__) {
        console.debug('Failed to show feedback button/widget:', error);
      }
      setIsVisible(true);
    }

    // we can close the feedback modals(sentry and custom modals), but can't do so for the Feedback button.
    // This hides the button after 10 seconds.
    if (type === 'button') {
      timeoutRef.current = setTimeout(() => {
        try {
          hideFeedbackButton();
        } catch (error) {
          if (__DEV__) {
            console.debug('Failed to hide feedback button:', error);
          }
        }
        timeoutRef.current = null;
      }, 10000);
    }
  }, []);

  const hideFeedbackModal = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    try {
      hideFeedbackButton();
    } catch (error) {
      if (__DEV__) {
        console.debug('Failed to hide feedback button:', error);
      }
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
