// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import { getPromptMockFromSearch, getPromptMockSearch } from './mockOnboardingFlow';
import {
  hasDiscloseRequestContext,
  parseBrowserHostTargetOrigin,
  parseVerificationRequestContext,
} from './verificationRequest';

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
        appEndpoint: 'https://partner.example/request',
        timestamp: 123456789,
        requestType: 'documentOwnershipConfirmed',
        verificationId: 'verif-1',
        environment: 'prod',
        version: 1,
        excludedCountries: [],
        endpointType: undefined,
        userIdType: undefined,
        chainID: undefined,
        userDefinedData: undefined,
        selfDefinedData: undefined,
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

    it('should parse new fields (endpointType, userIdType, chainID, userDefinedData, selfDefinedData)', () => {
      const context = parseVerificationRequestContext(
        '?endpointType=celo&userIdType=hex&chainID=42220&userDefinedData=custom&selfDefinedData=extra',
      );

      expect(context.endpointType).toBe('celo');
      expect(context.userIdType).toBe('hex');
      expect(context.chainID).toBe(42220);
      expect(context.userDefinedData).toBe('custom');
      expect(context.selfDefinedData).toBe('extra');
    });

    it('should pass through celo contract address endpoint', () => {
      const context = parseVerificationRequestContext('?appEndpoint=0xAbC123&endpointType=celo');

      expect(context.appEndpoint).toBe('0xAbC123');
    });

    it('should reject non-0x endpoint for celo endpointType', () => {
      const context = parseVerificationRequestContext('?appEndpoint=not-a-contract&endpointType=celo');

      expect(context.appEndpoint).toBe('');
    });

    it('should pass through 0x endpoint even without explicit endpointType', () => {
      const context = parseVerificationRequestContext('?appEndpoint=0xAbC123');

      expect(context.appEndpoint).toBe('0xAbC123');
    });

    it('should reject 0x endpoint when endpointType is explicitly https', () => {
      const context = parseVerificationRequestContext('?appEndpoint=0xAbC123&endpointType=https');

      expect(context.appEndpoint).toBe('');
    });

    it('should reject unsupported chainID values', () => {
      expect(parseVerificationRequestContext('?chainID=999').chainID).toBeUndefined();
      expect(parseVerificationRequestContext('?chainID=42220abc').chainID).toBeUndefined();
      expect(parseVerificationRequestContext('?chainID=').chainID).toBeUndefined();
    });

    it('should accept staging chainID', () => {
      expect(parseVerificationRequestContext('?chainID=11142220').chainID).toBe(11142220);
    });

    it('should default new fields to undefined when absent', () => {
      const context = parseVerificationRequestContext('?userId=user-1');

      expect(context.endpointType).toBeUndefined();
      expect(context.userIdType).toBeUndefined();
      expect(context.chainID).toBeUndefined();
      expect(context.userDefinedData).toBeUndefined();
      expect(context.selfDefinedData).toBeUndefined();
    });

    it('should require disclose items for the disclose route', () => {
      const withDisclosures = parseVerificationRequestContext('?disclosures=full_name');
      expect(hasDiscloseRequestContext(withDisclosures)).toBe(true);

      const withLabels = parseVerificationRequestContext('?proofItems=Full%20Name');
      expect(hasDiscloseRequestContext(withLabels)).toBe(true);

      const empty = parseVerificationRequestContext('?userId=user-1');
      expect(hasDiscloseRequestContext(empty)).toBe(false);
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
