// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import { decideBootRoute } from '../../src/components/decideBootRoute';
import type { VerificationRequestPayload } from '../../src/providers/OperatingModeProvider';

const VALID_REQUEST: VerificationRequestPayload = {
  userId: 'user-1',
  scope: 'test',
  disclosures: ['nationality'],
};

describe('decideBootRoute', () => {
  it('waits while OperatingModeProvider is still resolving', () => {
    expect(
      decideBootRoute({
        isReady: false,
        mode: 'self-app',
        verificationRequest: null,
        pathname: '/',
      }),
    ).toEqual({ type: 'wait' });
  });

  it('self-app on root → noop', () => {
    expect(
      decideBootRoute({
        isReady: true,
        mode: 'self-app',
        verificationRequest: null,
        pathname: '/',
      }),
    ).toEqual({ type: 'noop' });
  });

  it('self-app on any other path → noop (ModeRoute enforces mode access)', () => {
    expect(
      decideBootRoute({
        isReady: true,
        mode: 'self-app',
        verificationRequest: null,
        pathname: '/recover/required',
      }),
    ).toEqual({ type: 'noop' });
  });

  it('embed with valid request, on root → navigate into embed home with replace', () => {
    expect(
      decideBootRoute({
        isReady: true,
        mode: 'embed',
        verificationRequest: VALID_REQUEST,
        pathname: '/',
      }),
    ).toEqual({ type: 'navigate', to: '/tour/1', replace: true });
  });

  it('embed with valid request, already on a route → noop', () => {
    expect(
      decideBootRoute({
        isReady: true,
        mode: 'embed',
        verificationRequest: VALID_REQUEST,
        pathname: '/disclose/result',
      }),
    ).toEqual({ type: 'noop' });
  });

  it('embed with missing request → fail-closed to /embed/error', () => {
    expect(
      decideBootRoute({
        isReady: true,
        mode: 'embed',
        verificationRequest: null,
        pathname: '/',
      }),
    ).toEqual({
      type: 'fail-closed',
      error: 'INVALID_REQUEST',
      errorRoute: '/embed/error',
    });
  });

  it('embed with malformed request (missing scope) → fail-closed', () => {
    expect(
      decideBootRoute({
        isReady: true,
        mode: 'embed',
        verificationRequest: { userId: 'user-1' } as VerificationRequestPayload,
        pathname: '/tour/1',
      }),
    ).toEqual({
      type: 'fail-closed',
      error: 'INVALID_REQUEST',
      errorRoute: '/embed/error',
    });
  });

  it('embed with an NFC-only request but nfc unavailable → fail-closed', () => {
    expect(
      decideBootRoute({
        isReady: true,
        mode: 'embed',
        verificationRequest: { ...VALID_REQUEST, documentType: 'passport' },
        pathname: '/',
        capabilities: { nfc: false, mrzCamera: false, biometrics: true, secureStorage: true },
      }),
    ).toEqual({
      type: 'fail-closed',
      error: 'UNSUPPORTED_CAPABILITY',
      errorRoute: '/embed/error',
    });
  });

  it('embed with an NFC-only request and nfc available → proceeds', () => {
    expect(
      decideBootRoute({
        isReady: true,
        mode: 'embed',
        verificationRequest: { ...VALID_REQUEST, documentType: 'passport' },
        pathname: '/',
        capabilities: { nfc: true, mrzCamera: true, biometrics: true, secureStorage: true },
      }),
    ).toEqual({ type: 'navigate', to: '/tour/1', replace: true });
  });

  it('embed with an aadhaar request and no native capabilities → proceeds', () => {
    expect(
      decideBootRoute({
        isReady: true,
        mode: 'embed',
        verificationRequest: { ...VALID_REQUEST, documentType: 'aadhaar' },
        pathname: '/',
        capabilities: { nfc: false, mrzCamera: false, biometrics: false, secureStorage: false },
      }),
    ).toEqual({ type: 'navigate', to: '/tour/1', replace: true });
  });

  it('embed with missing capabilities is treated as all-true (backward compat)', () => {
    expect(
      decideBootRoute({
        isReady: true,
        mode: 'embed',
        verificationRequest: { ...VALID_REQUEST, documentType: 'passport' },
        pathname: '/',
      }),
    ).toEqual({ type: 'navigate', to: '/tour/1', replace: true });
  });
});
