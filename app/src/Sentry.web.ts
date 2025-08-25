// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { SENTRY_DSN } from '@env';
import * as Sentry from '@sentry/react';

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

export const captureFeedback = (
  feedback: string,
  context?: Record<string, any>,
) => {
  if (isSentryDisabled) {
    return;
  }

  Sentry.captureFeedback(
    {
      message: feedback,
      name: context?.name,
      email: context?.email,
      tags: {
        category: context?.category || 'general',
        source: context?.source || 'feedback_modal',
      },
    },
    {
      captureContext: {
        tags: {
          category: context?.category || 'general',
          source: context?.source || 'feedback_modal',
        },
      },
    },
  );
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
    integrations: [
      Sentry.feedbackIntegration({
        buttonOptions: {
          styles: {
            triggerButton: {
              position: 'absolute',
              top: 20,
              right: 20,
              bottom: undefined,
              marginTop: 100,
            },
          },
        },
        enableTakeScreenshot: true,
        namePlaceholder: 'Fullname',
        emailPlaceholder: 'Email',
      }),
    ],
  });
  return Sentry;
};

export const isSentryDisabled = !SENTRY_DSN;

export const wrapWithSentry = (App: React.ComponentType) => {
  return isSentryDisabled ? App : Sentry.withProfiler(App);
};
