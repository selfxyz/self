// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Platform, Vibration } from 'react-native';

import { triggerFeedback } from './trigger';

// Keep track of the loading screen interval
let loadingScreenInterval: ReturnType<typeof setInterval> | null = null;

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

// Define the base functions first
export const impactLight = () => triggerFeedback('impactLight');

export const impactMedium = () => triggerFeedback('impactMedium');

export const selectionChange = () => triggerFeedback('selection');

// Then define the aliases
export const buttonTap = impactLight;

export const cancelTap = selectionChange;

export const confirmTap = impactMedium;

/**
 * Haptic actions
 */
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

  triggerFeedback('impactHeavy');

  loadingScreenInterval = setInterval(() => {
    triggerFeedback('impactHeavy');
  }, 1000);
};

export const notificationError = () => triggerFeedback('notificationError');

export const notificationSuccess = () => triggerFeedback('notificationSuccess');

export const notificationWarning = () => triggerFeedback('notificationWarning');

export { triggerFeedback } from './trigger';
