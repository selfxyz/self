// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { SENTRY_DSN } from '@env';
import {
  addBreadcrumb,
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

export interface ProofContext {
  sessionId: string;
  userId?: string;
  circuitType: 'register' | 'dsc' | 'disclose' | null;
  currentState: string;
  stage: string;
  platform: 'ios' | 'android';
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

export const logProofEvent = (
  level: 'info' | 'warn' | 'error',
  message: string,
  context: ProofContext,
  extra?: Record<string, unknown>,
) => {
  if (isSentryDisabled) {
    return;
  }

  const data = {
    session_id: context.sessionId,
    user_id: context.userId,
    circuit_type: context.circuitType,
    current_state: context.currentState,
    stage: context.stage,
    platform: context.platform,
    ...extra,
  };

  if (level === 'error') {
    withScope(scope => {
      scope.setLevel('error');
      scope.setTag('session_id', context.sessionId);
      scope.setTag('circuit_type', String(context.circuitType));
      scope.setTag('current_state', context.currentState);
      scope.setTag('stage', context.stage);
      scope.setTag('platform', context.platform);
      if (context.userId) {
        scope.setUser({ id: context.userId });
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
      category: 'proof',
      data,
      timestamp: Date.now() / 1000,
    });
  }
};

export const logNFCEvent = (
  level: 'info' | 'warn' | 'error',
  message: string,
  context: NFCScanContext,
  extra?: Record<string, unknown>,
) => {
  if (isSentryDisabled) {
    return;
  }

  // Prepare data for breadcrumbs and messages
  const data = {
    session_id: context.sessionId,
    platform: context.platform,
    scan_type: context.scanType,
    stage: context.stage,
    user_id: context.userId,
    ...extra,
  };

  if (level === 'error') {
    // For errors, capture a message (this will include all previous breadcrumbs)
    withScope(scope => {
      scope.setLevel('error');
      scope.setTag('session_id', context.sessionId);
      scope.setTag('platform', context.platform);
      scope.setTag('scan_type', context.scanType);
      scope.setTag('stage', context.stage);
      if (context.userId) {
        scope.setUser({ id: context.userId });
      }
      if (extra) {
        Object.entries(extra).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }
      sentryCaptureMessage(message);
    });
  } else {
    // For info/warn, add as breadcrumb only
    addBreadcrumb({
      message,
      level: level === 'warn' ? 'warning' : 'info',
      category: 'nfc',
      data,
      timestamp: Date.now() / 1000,
    });
  }
};

export const wrapWithSentry = (App: React.ComponentType) => {
  return isSentryDisabled ? App : wrap(App);
};
