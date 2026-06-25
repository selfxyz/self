// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { SENTRY_DSN } from '@env';
import {
  addBreadcrumb,
  breadcrumbsIntegration,
  captureException as sentryCaptureException,
  captureFeedback as sentryCaptureFeedback,
  captureMessage as sentryCaptureMessage,
  feedbackIntegration,
  init as sentryInit,
  mobileReplayIntegration,
  setTag,
  withScope,
  wrap,
} from '@sentry/react-native';

import type {
  BaseContext,
  NFCScanContext,
  ProofContext,
} from '@selfxyz/mobile-sdk-alpha';
import {
  redactSensitiveFields,
  sanitizeTagValue,
} from '@selfxyz/mobile-sdk-alpha/observability';

export { redactSensitiveFields, sanitizeTagValue };
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
  'attempt_id',
  'initial_branch',
  'current_branch',
  'document_country',
  'signature_algorithm',
  'csca_hash_algorithm',
  'kyc_provider',
  'runtime',
  'webview_source',
  'reference_id',
  'verification_id',
]);

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

type WebViewLoadDiagnosticKind = 'timeout' | 'load_error' | 'version_mismatch';

/**
 * A terminal `version_mismatch` (a present-but-wrong protocol version,
 * `recoverable !== true`) is a definitive incompatibility → error; recoverable
 * mismatches, timeout, and load_error are retryable → warning.
 */
export const webViewDiagnosticLevel = (
  kind: WebViewLoadDiagnosticKind,
  detail?: Record<string, unknown>,
): 'error' | 'warning' =>
  kind === 'version_mismatch' && detail?.recoverable !== true
    ? 'error'
    : 'warning';

/**
 * Maps a SelfVerification load diagnostic to Sentry. Tagged so these can be
 * sliced out of the host runtime's noise.
 */
export const captureWebViewLoadDiagnostic = (
  kind: WebViewLoadDiagnosticKind,
  source: 'bundle' | 'dev-server',
  detail?: Record<string, unknown>,
) => {
  if (isSentryDisabled) {
    return;
  }
  withScope(scope => {
    scope.setLevel(webViewDiagnosticLevel(kind, detail));
    scope.setTag('runtime', 'rn-host');
    scope.setTag('webview_source', source);
    scope.setTag('error_code', kind);
    if (detail) {
      const redacted =
        redactSensitiveFields({ extra: { ...detail } }).extra ?? {};
      Object.entries(redacted).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    sentryCaptureException(new Error(`WebView load ${kind}`));
  });
};

/**
 * Uploads a redacted APDU fixture tape to Sentry as a JSON attachment. The
 * `json` is the exact, already-redacted payload the user previewed — there is no
 * separate path. No-op when Sentry is disabled (e.g. local builds).
 */
export const captureFixtureTape = (
  json: string,
  meta: { name: string; issuingCountry: string | null; status: string },
) => {
  if (isSentryDisabled) {
    return;
  }
  withScope(scope => {
    scope.setLevel('info');
    scope.addAttachment({
      filename: `${meta.name}.json`,
      data: json,
      contentType: 'application/json',
    });
    scope.setTag(
      'document_country',
      sanitizeTagValue(meta.issuingCountry ?? 'unknown'),
    );
    scope.setTag('scan_result', sanitizeTagValue(meta.status));
    sentryCaptureMessage('apdu_fixture_tape');
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

const sanitizeTagKey = (key: string): string | null => {
  if (!ALLOWED_TAG_KEYS.has(key)) {
    return null;
  }

  if (!/^[a-zA-Z0-9_]+$/.test(key)) {
    return null;
  }

  return key;
};

// Durable per-session reference tags for cross-runtime joins (RN host +
// WebView). Set when a WebView session starts, cleared when it ends so a
// failed session's id never leaks into a later session's events.
export const setReferenceTag = (
  referenceId: string,
  verificationId?: string,
): void => {
  if (isSentryDisabled) {
    return;
  }
  const cid = sanitizeTagValue(referenceId);
  if (sanitizeTagKey('reference_id') && cid) {
    setTag('reference_id', cid);
  }
  const vid = verificationId ? sanitizeTagValue(verificationId) : '';
  if (sanitizeTagKey('verification_id') && vid) {
    setTag('verification_id', vid);
  } else {
    setTag('verification_id', undefined);
  }
};

export const clearReferenceTag = (): void => {
  if (isSentryDisabled) {
    return;
  }
  setTag('reference_id', undefined);
  setTag('verification_id', undefined);
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

export const getSentryRuntimeFlags = () => {
  const disableSimulatorHeavyIntegrations = isIosSimulator();

  return {
    disableSimulatorHeavyIntegrations,
    enableFeedbackScreenshots: !disableSimulatorHeavyIntegrations,
    replaysOnErrorSampleRate: disableSimulatorHeavyIntegrations ? 0 : 1.0,
    replaysSessionSampleRate: disableSimulatorHeavyIntegrations ? 0 : 0.1,
  };
};

export const initSentry = () => {
  if (isSentryDisabled) {
    return;
  }

  const {
    disableSimulatorHeavyIntegrations,
    enableFeedbackScreenshots,
    replaysOnErrorSampleRate,
    replaysSessionSampleRate,
  } = getSentryRuntimeFlags();
  const feedback = feedbackIntegration({
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
    enableTakeScreenshot: enableFeedbackScreenshots,
    namePlaceholder: 'Fullname',
    emailPlaceholder: 'Email',
  });

  const breadcrumbs = breadcrumbsIntegration({
    console: false,
    fetch: false,
    xhr: true,
    sentry: true,
    dom: false,
    history: false,
  });

  const integrations = disableSimulatorHeavyIntegrations
    ? [breadcrumbs, feedback]
    : [
        breadcrumbs,
        mobileReplayIntegration({
          maskAllText: true,
          maskAllImages: true,
          maskAllVectors: true,
        }),
        feedback,
      ];

  sentryInit({
    dsn: SENTRY_DSN,
    debug: false,
    enableAutoSessionTracking: true,
    // Performance Monitoring
    tracesSampleRate: 1.0,
    // Replay and screenshots are disabled on iOS simulator to reduce cold-start pressure.
    replaysSessionSampleRate,
    replaysOnErrorSampleRate,
    beforeSend(event) {
      if (event.user) {
        delete event.user.ip_address;
        delete event.user.id;
      }
      return redactSensitiveFields(event);
    },
    integrations,
  });
};

export const isIosSimulator = () =>
  Platform.OS === 'ios' && DeviceInfo.isEmulatorSync();

export const isSentryDisabled = !SENTRY_DSN;

type LogLevel = 'info' | 'warn' | 'error';
type LogCategory = 'proof' | 'nfc' | 'auth';

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

export const logAuthEvent = (
  level: LogLevel,
  message: string,
  context: BaseContext & Record<string, unknown>,
  extra?: Record<string, unknown>,
) => logEvent(level, 'auth', message, context, extra);

export const setSupportUuidInSentry = (
  supportUuid: string | null,
  enabled = true,
) => {
  if (isSentryDisabled) {
    return;
  }

  setTag('support_uuid_enabled', enabled ? 'true' : 'false');
  setTag('support_uuid', enabled ? (supportUuid ?? 'unset') : 'disabled');
};

export const wrapWithSentry = (App: React.ComponentType) => {
  return isSentryDisabled ? App : wrap(App);
};
