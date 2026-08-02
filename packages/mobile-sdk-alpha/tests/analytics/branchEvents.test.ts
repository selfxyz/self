// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import { AadhaarEvents, BiometricEvents, KycEvents } from '../../src/constants/analytics';

// Branch event names are dashboard-load-bearing — Mixpanel funnels are keyed
// off these exact strings. Lock them with a snapshot-style assertion so a
// rename forces an explicit test update plus a dashboard migration.
describe('branch event constants (ANA-12)', () => {
  it('BiometricEvents covers the six ANA-12 milestones with the spec strings', () => {
    expect(BiometricEvents.MRZ_STARTED).toBe('Biometric: MRZ Started');
    expect(BiometricEvents.MRZ_CAPTURED).toBe('Biometric: MRZ Captured');
    expect(BiometricEvents.NFC_STARTED).toBe('Biometric: NFC Started');
    expect(BiometricEvents.NFC_SUCCEEDED).toBe('Biometric: NFC Succeeded');
    expect(BiometricEvents.DOCUMENT_PARSED).toBe('Biometric: Document Parsed');
    expect(BiometricEvents.DOCUMENT_UNSUPPORTED).toBe('Biometric: Document Unsupported');
  });

  it('KycEvents covers the five spec milestones', () => {
    expect(KycEvents.SESSION_REQUESTED).toBe('KYC: Session Requested');
    expect(KycEvents.SESSION_CREATED).toBe('KYC: Session Created');
    expect(KycEvents.PROVIDER_OPENED).toBe('KYC: Provider Opened');
    expect(KycEvents.PROVIDER_CLOSED).toBe('KYC: Provider Closed');
    expect(KycEvents.RETRY_TRIGGERED).toBe('KYC: Retry Triggered');
  });

  it('AadhaarEvents is curated to exactly eleven milestone events', () => {
    expect(Object.keys(AadhaarEvents).sort()).toEqual([
      'APP_INSTALL_PRESSED',
      'CONTINUE_PRESSED',
      'DATA_STORED',
      'DOWNLOAD_NEXT_PRESSED',
      'INSTRUCTIONS_VIEWED',
      'PHOTO_PERMISSION_DENIED',
      'QR_PARSE_FAILED',
      'QR_SELECTED',
      'TIMESTAMP_EXPIRED',
      'UPLOAD_FAILED',
      'UPLOAD_STARTED',
    ]);
    expect(AadhaarEvents.UPLOAD_STARTED).toBe('Aadhaar: Upload Started');
    expect(AadhaarEvents.UPLOAD_FAILED).toBe('Aadhaar: Upload Failed');
    expect(AadhaarEvents.PHOTO_PERMISSION_DENIED).toBe('Aadhaar: Photo Permission Denied');
    expect(AadhaarEvents.QR_SELECTED).toBe('Aadhaar: QR Selected');
    expect(AadhaarEvents.QR_PARSE_FAILED).toBe('Aadhaar: QR Parse Failed');
    expect(AadhaarEvents.TIMESTAMP_EXPIRED).toBe('Aadhaar: Timestamp Expired');
    expect(AadhaarEvents.DATA_STORED).toBe('Aadhaar: Data Stored');
    expect(AadhaarEvents.CONTINUE_PRESSED).toBe('Aadhaar: Continue Pressed');
    expect(AadhaarEvents.INSTRUCTIONS_VIEWED).toBe('Aadhaar: Instructions Viewed');
    expect(AadhaarEvents.APP_INSTALL_PRESSED).toBe('Aadhaar: App Install Pressed');
    expect(AadhaarEvents.DOWNLOAD_NEXT_PRESSED).toBe('Aadhaar: Download Next Pressed');
  });
});
