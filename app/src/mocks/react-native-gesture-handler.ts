// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/*
 * Web-compatible mock for react-native-gesture-handler
 */

import type React from 'react';
import { createElement } from 'react';

export const Directions = {
  RIGHT: 1,
  LEFT: 2,
  UP: 4,
  DOWN: 8,
};

const returnValue = {
  numberOfTaps: () => returnValue,
  onStart: () => returnValue,
  onEnd: () => returnValue,
  onCancel: () => returnValue,
  onFail: () => returnValue,
  onUpdate: () => returnValue,
  onFinalize: () => returnValue,
};

// Mock Gesture and GestureDetector for web
export const Gesture = {
  Pan: () => returnValue,
  Tap: () => returnValue,
  LongPress: () => returnValue,
  Pinch: () => returnValue,
  Rotation: () => returnValue,
  Fling: () => returnValue,
  Force: () => returnValue,
  Native: () => returnValue,
  Race: () => returnValue,
  Simultaneous: () => returnValue,
  Exclusive: () => returnValue,
  Composed: () => returnValue,
};

export const GestureDetector: React.FC<{
  children: React.ReactNode;
  gesture?: unknown;
}> = ({ children, gesture: _gesture }) => {
  return createElement('div', {}, children);
};

// Mock GestureHandlerRootView as a simple wrapper
export const GestureHandlerRootView: React.FC<{
  children: React.ReactNode;
  [key: string]: unknown;
}> = ({ children, ...props }) => {
  return createElement('div', props, children);
};

// Mock other commonly used exports
export const State = {
  UNDETERMINED: 0,
  FAILED: 1,
  BEGAN: 2,
  CANCELLED: 3,
  ACTIVE: 4,
  END: 5,
};

// Mock the jest setup
export const jestSetup = () => {};

// Default export for the main import
export default {
  GestureHandlerRootView,
  Gesture,
  GestureDetector,
  State,
  Directions,
  jestSetup,
};
