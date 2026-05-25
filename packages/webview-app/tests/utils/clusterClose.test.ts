// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import { CLUSTER_CLOSE, inferClusterFromPath } from '../../src/utils/clusterCloseRegistry';

describe('inferClusterFromPath', () => {
  it.each([
    ['/', 'home'],
    ['/settings', 'settings'],
    ['/settings/security', 'settings'],
    ['/onboarding/passport/nfc', 'onboarding'],
    ['/proving/history', 'proving'],
    ['/recovery/phrase-input', 'recovery'],
    ['/points', 'points'],
    ['/points/invite', 'points'],
    ['/account/verified', 'account'],
    ['/embed/error', 'embed'],
    ['/tunnel/tour/1', 'tunnel'],
    ['/dev/keychain', 'dev'],
  ])('maps %s → %s', (pathname, expected) => {
    expect(inferClusterFromPath(pathname)).toBe(expected);
  });

  it('falls back to home for unknown first segments', () => {
    expect(inferClusterFromPath('/totally-unknown-path')).toBe('home');
    expect(inferClusterFromPath('')).toBe('home');
    expect(inferClusterFromPath('/')).toBe('home');
  });
});

describe('CLUSTER_CLOSE registry', () => {
  it('has a self-app target for every cluster', () => {
    for (const [cluster, target] of Object.entries(CLUSTER_CLOSE)) {
      expect(target.selfApp, `cluster ${cluster} missing selfApp target`).toMatch(/^\//);
    }
  });

  it('has an embed target for every cluster (dismiss-only or set-result)', () => {
    for (const [cluster, target] of Object.entries(CLUSTER_CLOSE)) {
      expect(['dismiss-only', 'set-result']).toContain(target.embed.kind);
      if (target.embed.kind === 'set-result') {
        expect(target.embed.errorCode, `cluster ${cluster} set-result missing errorCode`).toBeTypeOf(
          'string',
        );
        expect(
          target.embed.errorMessage,
          `cluster ${cluster} set-result missing errorMessage`,
        ).toBeTypeOf('string');
      }
    }
  });

  it('user-cancellation clusters set a result before dismissing', () => {
    // Onboarding, proving, disclose, and tunnel are mid-flow surfaces — the
    // host should see a setResult+dismiss, not a bare dismiss, so it can
    // distinguish "user cancelled" from "user finished".
    for (const cluster of ['onboarding', 'proving', 'disclose', 'tunnel'] as const) {
      expect(CLUSTER_CLOSE[cluster].embed.kind).toBe('set-result');
    }
  });

  it('terminal-state clusters dismiss without setting a result', () => {
    // Home/settings/points/account/docs are not part of a verification flow,
    // so closing them in embed mode is a dismiss without a result payload.
    for (const cluster of ['home', 'settings', 'points', 'account', 'docs'] as const) {
      expect(CLUSTER_CLOSE[cluster].embed.kind).toBe('dismiss-only');
    }
  });
});
