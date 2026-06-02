// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Platform } from 'react-native';

import {
  getSentryRuntimeFlags,
  isIosSimulator,
  redactSensitiveFields,
} from '@/config/sentry';

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
  setTag: jest.fn(),
  withScope: jest.fn(),
  wrap: jest.fn(component => component),
}));

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

describe('redactSensitiveFields (ANA-13)', () => {
  it('redacts sensitive keys in breadcrumb data', () => {
    const event = redactSensitiveFields({
      breadcrumbs: [
        {
          data: {
            attempt_id: 'safe',
            passport_number: 'X1234567',
            mrz_line2: 'MRZ-DATA',
            dg1_hash: 'abc',
            chip_uid: 'deadbeef',
            unrelated: 'keep',
          },
        },
      ],
    });

    const data = event.breadcrumbs[0].data!;
    expect(data.attempt_id).toBe('safe');
    expect(data.unrelated).toBe('keep');
    expect(data.passport_number).toBe('[REDACTED]');
    expect(data.mrz_line2).toBe('[REDACTED]');
    expect(data.dg1_hash).toBe('[REDACTED]');
    expect(data.chip_uid).toBe('[REDACTED]');
  });

  it('redacts sensitive keys nested inside contexts', () => {
    const event = redactSensitiveFields({
      contexts: {
        scan: {
          ok: true,
          aadhaar_qr: 'RAW-QR',
          nested: { date_of_birth: '1990-01-01', name_first: 'Alice' },
        },
      },
    });

    const ctx = (event.contexts as { scan: Record<string, unknown> }).scan;
    expect(ctx.ok).toBe(true);
    expect(ctx.aadhaar_qr).toBe('[REDACTED]');
    const nested = ctx.nested as Record<string, unknown>;
    expect(nested.date_of_birth).toBe('[REDACTED]');
    expect(nested.name_first).toBe('[REDACTED]');
  });

  it('redacts sensitive keys in extra', () => {
    const event = redactSensitiveFields({
      extra: { passport_data: 'leaked', stage: 'ok' },
    });
    expect(event.extra!.passport_data).toBe('[REDACTED]');
    expect(event.extra!.stage).toBe('ok');
  });

  it('passes through events without sensitive keys', () => {
    const event = redactSensitiveFields({
      breadcrumbs: [{ data: { attempt_id: 'abc', stage: 'scan_started' } }],
    });
    expect(event.breadcrumbs[0].data).toEqual({
      attempt_id: 'abc',
      stage: 'scan_started',
    });
  });

  it('handles events without breadcrumbs/contexts/extra', () => {
    expect(() => redactSensitiveFields({})).not.toThrow();
  });

  it('preserves standard Sentry context keys that contain "name"', () => {
    const event = redactSensitiveFields({
      contexts: {
        os: { name: 'iOS', version: '17.4' },
        device: { name: 'iPhone 15', model: 'iPhone16,1' },
        app: { app_name: 'Self', app_version: '2.9.24' },
      },
    });
    const ctx = event.contexts as Record<string, Record<string, unknown>>;
    expect(ctx.os.name).toBe('iOS');
    expect(ctx.device.name).toBe('iPhone 15');
    expect(ctx.app.app_name).toBe('Self');
  });
});
