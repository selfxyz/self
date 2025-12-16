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
  mobileReplayIntegration,
  withScope,
  wrap,
} from '@sentry/react-native';

import type {
  BaseContext,
  NFCScanContext,
  ProofContext,
} from '@selfxyz/mobile-sdk-alpha';
// Security: Whitelist of allowed tag keys to prevent XSS
const ALLOWED_TAG_KEYS = new Set([
  'session_id',
  'platform',
  'stage',
  'circuitType',
  'currentState',
  'scanType',
  'error_code',
  'proof_step',
  'scan_result',
  'verification_status',
  'document_type',
]);

// Security: Sanitize tag values to prevent XSS
const sanitizeTagValue = (value: unknown): string => {
  if (value == null) return '';

  const stringValue = String(value);

  // Truncate to safe length
  const MAX_TAG_LENGTH = 200;
  const truncated =
    stringValue.length > MAX_TAG_LENGTH
      ? stringValue.substring(0, MAX_TAG_LENGTH) + '...'
      : stringValue;

  // Escape HTML characters and remove potentially dangerous characters
  return (
    truncated
      .replace(/[<>&"']/g, char => {
        switch (char) {
          case '<':
            return '&lt;';
          case '>':
            return '&gt;';
          case '&':
            return '&amp;';
          case '"':
            return '&quot;';
          case "'":
            return '&#x27;';
          default:
            return char;
        }
      })
      // Remove control characters and non-printable characters
      .replace(/[^\x20-\x7E]/g, '')
  );
};

// Security: Sanitize tag key to prevent XSS
const sanitizeTagKey = (key: string): string | null => {
  // Only allow whitelisted keys
  if (!ALLOWED_TAG_KEYS.has(key)) {
    return null;
  }

  // Additional validation: alphanumeric and underscores only
  if (!/^[a-zA-Z0-9_]+$/.test(key)) {
    return null;
  }

  return key;
};

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
      mobileReplayIntegration({
        maskAllText: true,
        maskAllImages: false,
        maskAllVectors: false,
      }),
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
        const sanitizedKey = sanitizeTagKey(key);
        if (sanitizedKey) {
          const sanitizedValue = sanitizeTagValue(value);
          scope.setTag(sanitizedKey, sanitizedValue);
        }
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

export const logNFCEvent = (
  level: LogLevel,
  message: string,
  context: NFCScanContext,
  extra?: Record<string, unknown>,
) => logEvent(level, 'nfc', message, context, extra);

export const logProofEvent = (
  level: LogLevel,
  message: string,
  context: ProofContext,
  extra?: Record<string, unknown>,
) => logEvent(level, 'proof', message, context, extra);

export const wrapWithSentry = (App: React.ComponentType) => {
  return isSentryDisabled ? App : wrap(App);
};
