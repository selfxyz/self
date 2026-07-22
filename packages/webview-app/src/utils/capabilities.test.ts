// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import type { Capabilities } from './capabilities';
import {
  ALL_CAPABILITIES,
  isDocumentTypeAvailable,
  normalizeCapabilities,
  requestRequiresUnavailableCapability,
} from './capabilities';

const withoutCamera: Capabilities = { ...ALL_CAPABILITIES, mrzCamera: false };
const withoutNfc: Capabilities = { ...ALL_CAPABILITIES, nfc: false };
const noNative: Capabilities = { nfc: false, mrzCamera: false, biometrics: false, secureStorage: false };

describe('isDocumentTypeAvailable', () => {
  it('treats every capability-gated type as available when fully capable', () => {
    for (const type of ['p', 'i', 'passport', 'id_card']) {
      expect(isDocumentTypeAvailable(type, ALL_CAPABILITIES)).toBe(true);
    }
  });

  it('requires mrzCamera for passport, not only nfc', () => {
    // Passport onboarding scans the MRZ before the NFC read, so a host without
    // a camera cannot complete it.
    expect(isDocumentTypeAvailable('p', withoutCamera)).toBe(false);
    expect(isDocumentTypeAvailable('passport', withoutCamera)).toBe(false);
  });

  it('requires nfc for passport', () => {
    expect(isDocumentTypeAvailable('p', withoutNfc)).toBe(false);
    expect(isDocumentTypeAvailable('passport', withoutNfc)).toBe(false);
  });

  it('requires nfc and mrzCamera for id cards', () => {
    expect(isDocumentTypeAvailable('i', withoutCamera)).toBe(false);
    expect(isDocumentTypeAvailable('id_card', withoutNfc)).toBe(false);
    expect(isDocumentTypeAvailable('i', ALL_CAPABILITIES)).toBe(true);
  });

  it('keeps types with no native requirement available regardless of capabilities', () => {
    for (const type of ['a', 'aadhaar', 'kyc', 'unknown']) {
      expect(isDocumentTypeAvailable(type, noNative)).toBe(true);
    }
  });
});

describe('normalizeCapabilities', () => {
  it('defaults a missing handshake to fully capable', () => {
    expect(normalizeCapabilities(null)).toEqual(ALL_CAPABILITIES);
    expect(normalizeCapabilities(undefined)).toEqual(ALL_CAPABILITIES);
  });

  it('defaults individually omitted fields to true and preserves explicit false', () => {
    expect(normalizeCapabilities({ mrzCamera: false })).toEqual({
      nfc: true,
      mrzCamera: false,
      biometrics: true,
      secureStorage: true,
    });
  });
});

describe('requestRequiresUnavailableCapability', () => {
  it('treats an unconstrained request as satisfiable', () => {
    expect(requestRequiresUnavailableCapability(null, noNative)).toBe(false);
    expect(requestRequiresUnavailableCapability({}, noNative)).toBe(false);
  });

  it('is false when at least one accepted type is available', () => {
    expect(requestRequiresUnavailableCapability({ documentTypes: ['passport', 'aadhaar'] }, withoutCamera)).toBe(false);
  });

  it('is true only when every accepted type needs an unavailable capability', () => {
    expect(requestRequiresUnavailableCapability({ documentType: 'passport' }, withoutCamera)).toBe(true);
    expect(requestRequiresUnavailableCapability({ ids: ['passport', 'id_card'] }, withoutNfc)).toBe(true);
  });
});
