// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sentryInit = vi.fn();
const replayIntegration = vi.fn((...args: unknown[]) => ({ name: 'Replay', options: args[0] }));
const breadcrumbsIntegration = vi.fn((...args: unknown[]) => ({ name: 'Breadcrumbs', options: args[0] }));
const setTag = vi.fn();

vi.mock('@sentry/react', () => ({
  init: (...args: unknown[]) => sentryInit(...args),
  replayIntegration: (...args: unknown[]) => replayIntegration(...args),
  breadcrumbsIntegration: (...args: unknown[]) => breadcrumbsIntegration(...args),
  setTag: (...args: unknown[]) => setTag(...args),
}));

vi.mock('@selfxyz/mobile-sdk-alpha/browser', () => ({
  COHORT_TAG_KEYS: [],
  redactSensitiveFields: (event: unknown) => event,
  sanitizeTagValue: (value: unknown) => String(value),
}));

const DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';

describe('webview-app Sentry config', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('VITE_SENTRY_DSN', DSN);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('registers Session Replay with always-on masking and RN-parity sample rates', async () => {
    const { initSentry } = await import('../../src/config/sentry');
    initSentry();

    expect(sentryInit).toHaveBeenCalledTimes(1);
    const config = sentryInit.mock.calls[0][0] as {
      replaysSessionSampleRate: number;
      replaysOnErrorSampleRate: number;
      integrations: (defaults: Array<{ name: string }>) => Array<{ name: string }>;
    };

    expect(config.replaysSessionSampleRate).toBe(0.1);
    expect(config.replaysOnErrorSampleRate).toBe(1.0);

    const integrations = config.integrations([]);
    expect(integrations.some(integration => integration.name === 'Replay')).toBe(true);
    expect(replayIntegration).toHaveBeenCalledWith({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    });
  });

  it('does not initialize Sentry (or replay) without a DSN', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    vi.resetModules();

    const { initSentry, isSentryEnabled } = await import('../../src/config/sentry');
    initSentry();

    expect(isSentryEnabled).toBe(false);
    expect(sentryInit).not.toHaveBeenCalled();
    expect(replayIntegration).not.toHaveBeenCalled();
  });

  describe('reference tags', () => {
    it('sets reference_id and verification_id when both provided', async () => {
      const { setReferenceTag } = await import('../../src/config/sentry');
      setReferenceTag('corr-1', 'vid-1');
      expect(setTag).toHaveBeenCalledWith('reference_id', 'corr-1');
      expect(setTag).toHaveBeenCalledWith('verification_id', 'vid-1');
    });

    it('sets reference_id and clears verification_id when verificationId is absent', async () => {
      const { setReferenceTag } = await import('../../src/config/sentry');
      setReferenceTag('corr-2');
      expect(setTag).toHaveBeenCalledWith('reference_id', 'corr-2');
      expect(setTag).toHaveBeenCalledWith('verification_id', undefined);
    });

    it('clears both tags', async () => {
      const { clearReferenceTag } = await import('../../src/config/sentry');
      clearReferenceTag();
      expect(setTag).toHaveBeenCalledWith('reference_id', undefined);
      expect(setTag).toHaveBeenCalledWith('verification_id', undefined);
    });

    it('is a no-op without a DSN', async () => {
      vi.stubEnv('VITE_SENTRY_DSN', '');
      vi.resetModules();
      const { setReferenceTag } = await import('../../src/config/sentry');
      setReferenceTag('corr-3', 'vid-3');
      expect(setTag).not.toHaveBeenCalled();
    });
  });
});
