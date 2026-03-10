// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Platform } from 'react-native';

let mockIsEmulator = false;

jest.mock('react-native-device-info', () => ({
  __esModule: true,
  default: {
    isEmulatorSync: jest.fn(() => mockIsEmulator),
  },
}));

jest.mock('@sentry/react-native', () => ({
  __esModule: true,
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  captureFeedback: jest.fn(),
  captureMessage: jest.fn(),
  consoleLoggingIntegration: jest.fn(),
  feedbackIntegration: jest.fn(),
  init: jest.fn(),
  mobileReplayIntegration: jest.fn(),
  withScope: jest.fn(),
  wrap: jest.fn(component => component),
}));

import { getSentryRuntimeFlags, isIosSimulator } from '@/config/sentry';

describe('sentry simulator isolation flags', () => {
  beforeEach(() => {
    mockIsEmulator = false;
    Platform.OS = 'ios';
  });

  it('detects iOS simulator runtime', () => {
    mockIsEmulator = true;

    expect(isIosSimulator()).toBe(true);
    expect(getSentryRuntimeFlags()).toEqual({
      disableSimulatorHeavyIntegrations: true,
      enableFeedbackScreenshots: false,
      replaysOnErrorSampleRate: 0,
      replaysSessionSampleRate: 0,
    });
  });

  it('keeps replay and screenshots enabled off simulator', () => {
    expect(isIosSimulator()).toBe(false);
    expect(getSentryRuntimeFlags()).toEqual({
      disableSimulatorHeavyIntegrations: false,
      enableFeedbackScreenshots: true,
      replaysOnErrorSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
    });
  });
});
