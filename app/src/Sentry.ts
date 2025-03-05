import * as Sentry from '@sentry/react-native';
import { ComponentType } from 'react';

import { SENTRY_DSN } from './config';

export const initSentry = (): typeof Sentry | null => {
  if (!SENTRY_DSN) {
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
  if (!SENTRY_DSN) {
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
  if (!SENTRY_DSN) {
    return;
  }

  Sentry.captureMessage(message, {
    extra: context,
  });
};

export const wrapWithSentry = (App: ComponentType): ComponentType => {
  return SENTRY_DSN ? Sentry.wrap(App) : App;
};
