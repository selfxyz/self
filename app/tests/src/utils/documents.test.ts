// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { DocumentMetadata } from '@selfxyz/common';

import { isDocumentInactive } from '@/utils/documents';

const createMockMetadata = (
  overrides: Partial<DocumentMetadata> = {},
): DocumentMetadata =>
  ({
    id: 'test-doc-id',
    documentType: 'aadhaar',
    documentCategory: 'aadhaar',
    data: 'test-data',
    mock: false,
    isRegistered: true,
    registeredAt: Date.now(),
    ...overrides,
  }) as DocumentMetadata;

describe('isDocumentInactive', () => {
  describe('registered pre-document expiration', () => {
    describe('when hasExpirationDate is undefined', () => {
      it('returns true for aadhaar document', () => {
        const metadata = createMockMetadata({
          documentCategory: 'aadhaar',
          hasExpirationDate: undefined,
        });

        const result = isDocumentInactive(metadata);

        expect(result).toBe(true);
      });

      it('returns false for passport document', () => {
        const metadata = createMockMetadata({
          documentCategory: 'passport',
          hasExpirationDate: undefined,
        });

        const result = isDocumentInactive(metadata);

        expect(result).toBe(false);
      });

      it('returns false for id_card document', () => {
        const metadata = createMockMetadata({
          documentCategory: 'id_card',
          hasExpirationDate: undefined,
        });

        const result = isDocumentInactive(metadata);

        expect(result).toBe(false);
      });
    });
  });

  describe('registered post-document expiration', () => {
    describe('when hasExpirationDate is true', () => {
      it('returns false for aadhaar document', () => {
        const metadata = createMockMetadata({
          documentCategory: 'aadhaar',
          hasExpirationDate: true,
        });

        const result = isDocumentInactive(metadata);

        expect(result).toBe(false);
      });

      it('returns false for passport document', () => {
        const metadata = createMockMetadata({
          documentCategory: 'passport',
          hasExpirationDate: true,
        });

        const result = isDocumentInactive(metadata);

        expect(result).toBe(false);
      });

      it('returns false for id_card document', () => {
        const metadata = createMockMetadata({
          documentCategory: 'id_card',
          hasExpirationDate: true,
        });

        const result = isDocumentInactive(metadata);

        expect(result).toBe(false);
      });
    });

    describe('when hasExpirationDate is false', () => {
      it('returns false for aadhaar document', () => {
        const metadata = createMockMetadata({
          documentCategory: 'aadhaar',
          hasExpirationDate: false,
        });

        const result = isDocumentInactive(metadata);

        expect(result).toBe(false);
      });

      it('returns false for passport document', () => {
        const metadata = createMockMetadata({
          documentCategory: 'passport',
          hasExpirationDate: false,
        });

        const result = isDocumentInactive(metadata);

        expect(result).toBe(false);
      });

      it('returns false for id_card document', () => {
        const metadata = createMockMetadata({
          documentCategory: 'id_card',
          hasExpirationDate: false,
        });

        const result = isDocumentInactive(metadata);

        expect(result).toBe(false);
      });
    });
  });
});
