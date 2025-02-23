import { SENTRY_DSN } from '@env';
import * as Sentry from '@sentry/react-native';

export const initSentry = () => {
  if (!SENTRY_DSN) {
    return null;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    debug: __DEV__,
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
  if (!SENTRY_DSN) {
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
  if (!SENTRY_DSN) {
    return;
  }
  Sentry.captureMessage(message, {
    extra: context,
  });
};

export const wrapWithSentry = (App: React.ComponentType) => {
  return SENTRY_DSN ? Sentry.wrap(App) : App;
};
