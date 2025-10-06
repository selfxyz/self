// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import type { DocumentMetadata } from '@selfxyz/common/utils/types';

import { formatDataPreview, humanizeDocumentType, maskId } from '../../src/utils/document';

describe('document utils', () => {
  describe('humanizeDocumentType', () => {
    it('adds a Mock prefix for mock document identifiers', () => {
      expect(humanizeDocumentType('mock_passport')).toBe('Mock Passport');
      expect(humanizeDocumentType('mock_driver_license')).toBe('Mock Driver License');
    });

    it('converts underscores into spaces and capitalises words', () => {
      expect(humanizeDocumentType('eu_id_card')).toBe('Eu Id Card');
      expect(humanizeDocumentType('aadhaar')).toBe('Aadhaar');
    });
  });

  describe('formatDataPreview', () => {
    const baseMeta = (data?: string): DocumentMetadata =>
      ({
        id: 'abcdef1234567890',
        documentType: 'mock_passport',
        documentCategory: 'passport',
        data: data ?? '',
        mock: true,
        isRegistered: false,
      }) as DocumentMetadata;

    it('returns a friendly message when no data is available', () => {
      expect(formatDataPreview(baseMeta(''))).toBe('No preview available');
      expect(formatDataPreview(baseMeta(undefined as unknown as string))).toBe('No preview available');
    });

    it('normalises newlines and limits the preview to two lines', () => {
      const meta = baseMeta('LINE1\r\nLINE2\r\nLINE3');
      expect(formatDataPreview(meta)).toBe('LINE1\nLINE2');
    });

    it('truncates long previews to 120 characters with an ellipsis', () => {
      const long = 'A'.repeat(200);
      const meta = baseMeta(`${long}\nNEXT`);
      const preview = formatDataPreview(meta);
      expect(preview.length).toBe(120);
      expect(preview.endsWith('…')).toBe(true);
    });
  });

  describe('maskId', () => {
    it('preserves an 8 character prefix and 6 character suffix for long identifiers', () => {
      const id = '12345678abcdefghij123456';
      expect(maskId(id)).toBe('12345678…123456');
    });

    it('omits the ellipsis when the identifier is shorter than the threshold', () => {
      expect(maskId('123456')).toBe('123456');
      expect(maskId('1234567')).toBe('1234567');
      expect(maskId('12345678')).toBe('12345678');
      expect(maskId('123456789')).toBe('12345678…9');
    });
  });
});
