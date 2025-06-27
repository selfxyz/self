// Web-compatible mock for react-native-gesture-handler
import React from 'react';

// Mock GestureHandlerRootView as a simple wrapper
export const GestureHandlerRootView: React.FC<{
  children: React.ReactNode;
  [key: string]: any;
}> = ({ children, ...props }) => {
  return React.createElement('div', props, children);
};

// Mock Gesture and GestureDetector for web
export const Gesture = {
  Pan: () => ({}),
  Tap: () => ({}),
  LongPress: () => ({}),
  Pinch: () => ({}),
  Rotation: () => ({}),
  Fling: () => ({}),
  Force: () => ({}),
  Native: () => ({}),
  Race: () => ({}),
  Simultaneous: () => ({}),
  Exclusive: () => ({}),
  Composed: () => ({}),
};

export const GestureDetector: React.FC<{
  children: React.ReactNode;
  gesture?: any;
}> = ({ children, gesture: _gesture }) => {
  return React.createElement('div', {}, children);
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

export const Directions = {
  RIGHT: 1,
  LEFT: 2,
  UP: 4,
  DOWN: 8,
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
