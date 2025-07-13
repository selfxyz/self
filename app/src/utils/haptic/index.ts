// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { Platform, Vibration } from 'react-native';

import { triggerFeedback } from './trigger';

// Keep track of the loading screen interval
let loadingScreenInterval: NodeJS.Timeout | null = null;

/**
 * Haptic actions
 */
export const impactLight = () => triggerFeedback('impactLight');
export const impactMedium = () => triggerFeedback('impactMedium');
export const notificationError = () => triggerFeedback('notificationError');
export const notificationSuccess = () => triggerFeedback('notificationSuccess');
export const notificationWarning = () => triggerFeedback('notificationWarning');
export const selectionChange = () => triggerFeedback('selection');
export const buttonTap = impactLight;
export const cancelTap = selectionChange;
export const confirmTap = impactMedium;

// Custom feedback events

export const loadingScreenProgress = (shouldVibrate: boolean = true) => {
  // Clear any existing interval
  if (loadingScreenInterval) {
    clearInterval(loadingScreenInterval);
    loadingScreenInterval = null;
  }

  // If we shouldn't vibrate, just stop here
  if (!shouldVibrate) {
    Vibration.cancel();
    return;
  }

  // Function to trigger the haptic feedback
  const triggerHaptic = () => {
    if (Platform.OS === 'android') {
      // Pattern: [delay, duration, delay, duration, ...]
      // First heavy impact at 500ms
      // Then three light impacts at 750ms intervals
      triggerFeedback('custom', {
        pattern: [
          500,
          100, // Heavy impact
          750,
          50, // First light impact
          750,
          50, // Second light impact
          750,
          50, // Third light impact
        ],
      });
    } else {
      setTimeout(() => {
        triggerFeedback('impactHeavy');
      }, 750);
      setTimeout(() => {
        feedbackProgress();
      }, 750);
    }
  };

  // Trigger immediately
  triggerHaptic();

  // Set up interval for continuous feedback
  // Total pattern duration (2950ms) + 1 second pause (1000ms) = 3950ms
  loadingScreenInterval = setInterval(triggerHaptic, 4000);
};

// consistent light feedback at a steady interval
export const feedbackProgress = () => {
  if (Platform.OS === 'android') {
    // Pattern: [delay, duration, delay, duration, ...]
    // Three light impacts at 750ms intervals
    triggerFeedback('custom', {
      pattern: [
        0,
        50, // First light impact
        750,
        50, // Second light impact
        750,
        50, // Third light impact
      ],
    });
    return;
  }

  // Match the timing of the light impacts in the Android pattern
  setTimeout(() => {
    triggerFeedback('impactLight');
  }, 750); // First light impact
  setTimeout(() => {
    triggerFeedback('impactLight');
  }, 1500); // Second light impact (750ms after first)
  setTimeout(() => {
    triggerFeedback('impactLight');
  }, 2250); // Third light impact (750ms after second)
};

// light -> medium -> heavy intensity in sequence
export const feedbackSuccess = () => {
  if (Platform.OS === 'android') {
    // Pattern: [delay, duration, delay, duration, ...]
    // Increasing intensity sequence: light -> medium -> heavy
    triggerFeedback('custom', {
      pattern: [
        500,
        50, // Initial delay, then light impact
        200,
        100, // Medium impact
        150,
        150, // Heavy impact
      ],
    });
    return;
  }

  setTimeout(() => {
    triggerFeedback('impactLight');
  }, 500);
  setTimeout(() => {
    triggerFeedback('impactMedium');
  }, 750);
  setTimeout(() => {
    triggerFeedback('impactHeavy');
  }, 1000);
};

// heavy -> medium -> light intensity in sequence
export const feedbackUnsuccessful = () => {
  if (Platform.OS === 'android') {
    // Pattern: [delay, duration, delay, duration, ...]
    // Decreasing intensity sequence: heavy -> medium -> light
    triggerFeedback('custom', {
      pattern: [
        500,
        150, // Initial delay, then heavy impact
        100,
        100, // Medium impact
        150,
        50, // Light impact
      ],
    });
    return;
  }

  setTimeout(() => {
    triggerFeedback('impactHeavy');
  }, 500);
  setTimeout(() => {
    triggerFeedback('impactMedium');
  }, 750);
  setTimeout(() => {
    triggerFeedback('impactLight');
  }, 1000);
};

export { triggerFeedback } from './trigger';
