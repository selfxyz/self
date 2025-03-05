import * as Sentry from '@sentry/react-native';
import { ComponentType } from 'react';

import { SENTRY_DSN } from './config';

const isSentryEnabled = (): boolean => {
  return SENTRY_DSN !== undefined && SENTRY_DSN !== null && SENTRY_DSN !== '';
};

export const initSentry = (): typeof Sentry | null => {
  if (!isSentryEnabled()) {
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
  context?: Record<string, unknown>,
): void => {
  if (!isSentryEnabled()) {
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
};

export const captureMessage = (
  message: string,
  context?: Record<string, unknown>,
): void => {
  if (!isSentryEnabled()) {
    return;
  }

  Sentry.captureMessage(message, {
    extra: context,
  });
};

export const wrapWithSentry = (App: ComponentType): ComponentType => {
  return isSentryEnabled() ? Sentry.wrap(App) : App;
};
