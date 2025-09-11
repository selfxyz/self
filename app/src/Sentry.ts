// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { SENTRY_DSN } from '@env';
import {
  captureException as sentryCaptureException,
  captureFeedback as sentryCaptureFeedback,
  captureMessage as sentryCaptureMessage,
  consoleLoggingIntegration,
  feedbackIntegration,
  init as sentryInit,
  withScope,
  wrap,
} from '@sentry/react-native';

export interface NFCScanContext {
  sessionId: string;
  userId?: string;
  platform: 'ios' | 'android';
  scanType: 'mrz' | 'can';
  stage: string;
}

export const captureException = (
  error: Error,
  context?: Record<string, unknown>,
) => {
  if (isSentryDisabled) {
    return;
  }
  sentryCaptureException(error, {
    extra: context,
  });
};

export const captureFeedback = (
  feedback: string,
  context?: Record<string, unknown>,
) => {
  if (isSentryDisabled) {
    return;
  }

  sentryCaptureFeedback(
    {
      message: feedback,
      name: context?.name as string | undefined,
      email: context?.email as string | undefined,
      tags: {
        category: (context?.category as string) || 'general',
        source: (context?.source as string) || 'feedback_modal',
      },
    },
    {
      captureContext: {
        tags: {
          category: (context?.category as string) || 'general',
          source: (context?.source as string) || 'feedback_modal',
        },
      },
    },
  );
};

export const captureMessage = (
  message: string,
  context?: Record<string, unknown>,
) => {
  if (isSentryDisabled) {
    return;
  }
  sentryCaptureMessage(message, {
    extra: context,
  });
};

export const initSentry = () => {
  if (isSentryDisabled) {
    return;
  }

  sentryInit({
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
    integrations: [
      consoleLoggingIntegration({
        levels: ['log', 'error', 'warn', 'info', 'debug'],
      }),
      feedbackIntegration({
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
    _experiments: {
      enableLogs: true,
    },
  });
};

export const isSentryDisabled = !SENTRY_DSN;

export const logNFCEvent = (
  level: 'info' | 'warn' | 'error',
  message: string,
  context: NFCScanContext,
  extra?: Record<string, unknown>,
) => {
  if (isSentryDisabled) {
    return;
  }

  const levelMap = {
    info: 'info',
    warn: 'warning',
    error: 'error',
  } as const;

  withScope(scope => {
    scope.setLevel(levelMap[level] as any);
    scope.setTag('session_id', context.sessionId);
    scope.setTag('platform', context.platform);
    scope.setTag('scan_type', context.scanType);
    scope.setTag('stage', context.stage);
    if (context.userId) {
      scope.setUser({ id: context.userId });
    }
    if (extra) {
      Object.entries(extra).forEach(([key, value]) => {
        scope.setExtra(key, value as any);
      });
    }
    sentryCaptureMessage(message);
  });
};

export const wrapWithSentry = (App: React.ComponentType) => {
  return isSentryDisabled ? App : wrap(App);
};
