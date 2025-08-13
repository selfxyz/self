// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { useCallback, useEffect, useRef, useState } from 'react';

import { captureFeedback } from '../Sentry';

import {
  hideFeedbackButton,
  showFeedbackButton,
  showFeedbackWidget,
} from '@sentry/react-native';

export type FeedbackType = 'button' | 'widget' | 'custom';

export const useFeedbackModal = () => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const showFeedbackModal = useCallback((type: FeedbackType = 'button') => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

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

    // we can close the feedback modals(sentry and custom modals), but can't do so for the Feedback button.
    // This hides the button after 10 seconds.
    if (type === 'button') {
      timeoutRef.current = setTimeout(() => {
        hideFeedbackButton();
        timeoutRef.current = null;
      }, 10000);
    }
  }, []);

  const hideFeedbackModal = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    hideFeedbackButton();

    setIsVisible(false);
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
  };
};
