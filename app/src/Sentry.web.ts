// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { SENTRY_DSN } from '@env';
import * as Sentry from '@sentry/react';

export const isSentryDisabled = !SENTRY_DSN;

export const initSentry = () => {
  if (isSentryDisabled) {
    return null;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    debug: false,
    // Performance Monitoring
    tracesSampleRate: 1.0,
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Disable collection of PII data
    beforeSend(event) {
      // Remove PII data
      if (event.user) {
        event.user.ip_address = undefined;
        event.user.id = undefined;
      }
      return event;
    },
  });
  return Sentry;
};

export const captureException = (
  error: Error,
  context?: Record<string, any>,
) => {
  if (isSentryDisabled) {
    return;
  }
  Sentry.captureException(error, {
    extra: context,
  });
};

export const captureMessage = (
  message: string,
  context?: Record<string, any>,
) => {
  if (isSentryDisabled) {
    return;
  }
  Sentry.captureMessage(message, {
    extra: context,
  });
};

export const wrapWithSentry = (App: React.ComponentType) => {
  return isSentryDisabled ? App : Sentry.withProfiler(App);
};
