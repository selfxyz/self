// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import { getPromptMockFromSearch, getPromptMockSearch } from './mockOnboardingFlow';
import { parseBrowserHostTargetOrigin, parseVerificationRequestContext } from './verificationRequest';

describe('verificationRequest utils', () => {
  describe('parseBrowserHostTargetOrigin', () => {
    it('should reject wildcard target origin by default', () => {
      expect(parseBrowserHostTargetOrigin('?targetOrigin=*')).toBeUndefined();
    });

    it('should allow wildcard target origin only when explicitly enabled', () => {
      expect(
        parseBrowserHostTargetOrigin('?targetOrigin=*', {
          allowWildcard: true,
        }),
      ).toBe('*');
    });

    it('should normalize an https target origin', () => {
      expect(parseBrowserHostTargetOrigin('?targetOrigin=https://host.example/path?foo=bar')).toBe(
        'https://host.example',
      );
    });

    it('should allow localhost http target origins', () => {
      expect(parseBrowserHostTargetOrigin('?targetOrigin=http://localhost:3000/embed')).toBe('http://localhost:3000');
    });

    it('should reject non-local http target origins', () => {
      expect(parseBrowserHostTargetOrigin('?targetOrigin=http://host.example/embed')).toBeUndefined();
    });

    it('should reject invalid target origins', () => {
      expect(parseBrowserHostTargetOrigin('?targetOrigin=not-a-valid-url')).toBeUndefined();
    });
  });

  describe('parseVerificationRequestContext', () => {
    it('should parse the expected request context fields', () => {
      const context = parseVerificationRequestContext(
        '?userId=user-1&scope=kyc&disclosures=full_name,dob&proofItems=Full%20Name,Date%20of%20Birth&appName=Partner&appEndpoint=https://partner.example/request&timestamp=123456789&resultType=documentOwnershipConfirmed&verificationId=verif-1',
      );

      expect(context).toEqual({
        request: {
          userId: 'user-1',
          scope: 'kyc',
          disclosures: ['full_name', 'dob'],
        },
        displayLabels: ['Full Name', 'Date of Birth'],
        appName: 'Partner',
        appEndpoint: 'partner.example',
        timestamp: 123456789,
        requestType: 'documentOwnershipConfirmed',
        verificationId: 'verif-1',
        environment: 'prod',
        version: 1,
      });
    });

    it('should parse environment and version from query params', () => {
      const staging = parseVerificationRequestContext('?environment=staging&version=2');
      expect(staging.environment).toBe('stg');
      expect(staging.version).toBe(2);

      const stg = parseVerificationRequestContext('?environment=stg');
      expect(stg.environment).toBe('stg');

      const prod = parseVerificationRequestContext('?environment=prod');
      expect(prod.environment).toBe('prod');

      const invalid = parseVerificationRequestContext('?environment=unknown&version=abc');
      expect(invalid.environment).toBe('prod');
      expect(invalid.version).toBe(1);

      const missing = parseVerificationRequestContext('');
      expect(missing.environment).toBe('prod');
      expect(missing.version).toBe(1);
    });

    it('should fall back when request type or endpoint are invalid', () => {
      const context = parseVerificationRequestContext('?appEndpoint=http://evil.example/path&resultType=unexpected');

      expect(context.requestType).toBe('proofRequested');
      expect(context.appEndpoint).toBe('');
      expect(context.verificationId).toBeUndefined();
    });
  });

  describe('prompt mock utils', () => {
    it('should parse supported prompt mock states', () => {
      expect(getPromptMockFromSearch('?mock=default')).toBe('default');
      expect(getPromptMockFromSearch('?mock=existing-account')).toBe('existing-account');
    });

    it('should fall back to the default prompt mock state', () => {
      expect(getPromptMockFromSearch('?mock=unexpected')).toBe('default');
      expect(getPromptMockSearch()).toBe('?mock=default');
    });
  });
});
