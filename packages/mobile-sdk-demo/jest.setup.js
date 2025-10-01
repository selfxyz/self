// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/** @jest-environment jsdom */

// Mock React Native's native modules
const { NativeModules } = require('react-native');

// Mock NativeModules
NativeModules.PlatformConstants = {
  getConstants: () => ({
    isTesting: true,
    reactNativeVersion: {
      major: 0,
      minor: 76,
      patch: 9,
    },
  }),
};

// Mock DeviceInfo native module
NativeModules.DeviceInfo = {
  getConstants: () => ({
    Dimensions: {
      window: { width: 375, height: 812 },
      screen: { width: 375, height: 812 },
    },
    PixelRatio: 2,
  }),
};

// Mock other common native modules
NativeModules.StatusBarManager = {
  getConstants: () => ({}),
};

NativeModules.Appearance = {
  getConstants: () => ({}),
};

NativeModules.SourceCode = {
  getConstants: () => ({
    scriptURL: 'http://localhost:8081/index.bundle?platform=ios&dev=true',
  }),
};

NativeModules.UIManager = {
  getConstants: () => ({}),
  measure: jest.fn(),
  measureInWindow: jest.fn(),
  measureLayout: jest.fn(),
  findSubviewIn: jest.fn(),
  dispatchViewManagerCommand: jest.fn(),
  setLayoutAnimationEnabledExperimental: jest.fn(),
  configureNextLayoutAnimation: jest.fn(),
  removeSubviewsFromContainerWithID: jest.fn(),
  replaceExistingNonRootView: jest.fn(),
  setChildren: jest.fn(),
  manageChildren: jest.fn(),
  setJSResponder: jest.fn(),
  clearJSResponder: jest.fn(),
  createView: jest.fn(),
  updateView: jest.fn(),
  removeRootView: jest.fn(),
  addRootView: jest.fn(),
  updateRootView: jest.fn(),
};

NativeModules.KeyboardObserver = {
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};

// Mock react-native-get-random-values
jest.mock(
  'react-native-get-random-values',
  () => ({
    polyfillGlobal: jest.fn(),
  }),
  { virtual: true },
);

// Mock console methods to avoid test output clutter
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
