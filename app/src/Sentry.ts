//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import { SENTRY_DSN } from '@env';
import * as Sentry from '@sentry/react-native';

export const isSentryDisabled = !SENTRY_DSN;

export const initSentry = () => {
  if (isSentryDisabled) {
    return null;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    debug: false,
    enableAutoSessionTracking: true,
    // Performance Monitoring
    tracesSampleRate: 1.0,
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Disable collection of PII data
    beforeSend(event) {
      // Remove PII data
      if (event.user) {
        delete event.user.ip_address;
        delete event.user.id;
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
  return isSentryDisabled ? App : Sentry.wrap(App);
};
