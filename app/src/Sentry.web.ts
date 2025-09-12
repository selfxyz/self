// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { SENTRY_DSN } from '@env';
import {
  addBreadcrumb,
  captureException as sentryCaptureException,
  captureFeedback as sentryCaptureFeedback,
  captureMessage as sentryCaptureMessage,
  feedbackIntegration,
  init as sentryInit,
  withProfiler,
  withScope,
} from '@sentry/react';

interface BaseContext {
  sessionId: string;
  userId?: string;
  platform: 'ios' | 'android';
  stage: string;
}

export interface NFCScanContext extends BaseContext {
  scanType: 'mrz' | 'can';
}

export interface ProofContext extends BaseContext {
  circuitType: 'register' | 'dsc' | 'disclose' | null;
  currentState: string;
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
  });
};

export const isSentryDisabled = !SENTRY_DSN;

type LogLevel = 'info' | 'warn' | 'error';
type LogCategory = 'proof' | 'nfc';

export const logEvent = (
  level: LogLevel,
  category: LogCategory,
  message: string,
  context: BaseContext & Record<string, unknown>,
  extra?: Record<string, unknown>,
) => {
  if (isSentryDisabled) {
    return;
  }

  const { sessionId, userId, platform, stage, ...rest } = context;
  const data = {
    session_id: sessionId,
    user_id: userId,
    platform,
    stage,
    ...rest,
    ...extra,
  };

  if (level === 'error') {
    withScope(scope => {
      scope.setLevel('error');
      scope.setTag('session_id', sessionId);
      scope.setTag('platform', platform);
      scope.setTag('stage', stage);
      Object.entries(rest).forEach(([key, value]) => {
        scope.setTag(key, String(value));
      });
      if (userId) {
        scope.setUser({ id: userId });
      }
      if (extra) {
        Object.entries(extra).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }
      sentryCaptureMessage(message);
    });
  } else {
    addBreadcrumb({
      message,
      level: level === 'warn' ? 'warning' : 'info',
      category,
      data,
      timestamp: Date.now() / 1000,
    });
  }
};

export const logProofEvent = (
  level: LogLevel,
  message: string,
  context: ProofContext,
  extra?: Record<string, unknown>,
) => logEvent(level, 'proof', message, context, extra);

export const logNFCEvent = (
  level: LogLevel,
  message: string,
  context: NFCScanContext,
  extra?: Record<string, unknown>,
) => logEvent(level, 'nfc', message, context, extra);

export const wrapWithSentry = (App: React.ComponentType) => {
  return isSentryDisabled ? App : withProfiler(App);
};
