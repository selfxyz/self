// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import type { DocumentCatalog, DocumentMetadata } from '@selfxyz/common/types';
import type { PassportData } from '@selfxyz/common/types/passport';

import {
  checkDocumentExpiration,
  isDocumentValidForProving,
  pickBestDocumentToSelect,
} from '../../src/documents/validation';

describe('checkDocumentExpiration', () => {
  it('returns false for invalid format (too short)', () => {
    expect(checkDocumentExpiration('1234')).toBe(false);
  });

  it('returns false for invalid format (too long)', () => {
    expect(checkDocumentExpiration('1234567')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(checkDocumentExpiration('')).toBe(false);
  });

  it('returns true for expired date (past date)', () => {
    // Date in 2020
    expect(checkDocumentExpiration('200101')).toBe(true);
  });

  it('returns false for future date', () => {
    // Date in 2050
    expect(checkDocumentExpiration('500101')).toBe(false);
  });

  it('returns true for today (expired as of today)', () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const today = `${year}${month}${day}`;
    // Document that expires today is considered expired
    expect(checkDocumentExpiration(today)).toBe(true);
  });

  it('returns true for yesterday (expired)', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const year = yesterday.getFullYear().toString().slice(-2);
    const month = (yesterday.getMonth() + 1).toString().padStart(2, '0');
    const day = yesterday.getDate().toString().padStart(2, '0');
    const yesterdayStr = `${year}${month}${day}`;
    expect(checkDocumentExpiration(yesterdayStr)).toBe(true);
  });
});

describe('isDocumentValidForProving', () => {
  const mockMetadata: DocumentMetadata = {
    id: 'test-id',
    documentType: 'passport',
    documentCategory: 'passport',
    data: 'mock-data',
    mock: false,
  };

  it('returns true for document without data (cannot check expiry)', () => {
    expect(isDocumentValidForProving(mockMetadata)).toBe(true);
  });

  it('returns true for mock document', () => {
    const mockDoc: DocumentMetadata = {
      ...mockMetadata,
      mock: true,
    };
    expect(isDocumentValidForProving(mockDoc)).toBe(true);
  });

  it('returns true for valid passport with future expiry', () => {
    // MRZ with expiry date 501231 (December 31, 2050)
    const validPassport: PassportData = {
      mrz: 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L898902C36UTO7408122F5012319ZE184226B<<<<<10',
      dsc: 'mock-dsc',
      eContent: [1, 2, 3],
      signedAttr: [1, 2, 3],
      encryptedDigest: [1, 2, 3],
      documentType: 'passport',
      documentCategory: 'passport',
      mock: false,
    };

    expect(isDocumentValidForProving(mockMetadata, validPassport)).toBe(true);
  });

  it('returns false for expired passport', () => {
    // Passport expired in 2012
    const expiredPassport: PassportData = {
      mrz: 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L898902C36UTO7408122F1204159ZE184226B<<<<<10',
      dsc: 'mock-dsc',
      eContent: [1, 2, 3],
      signedAttr: [1, 2, 3],
      encryptedDigest: [1, 2, 3],
      documentType: 'passport',
      documentCategory: 'passport',
      mock: false,
    };

    // Modify MRZ to have expired date (120415 = April 15, 2012)
    const mrzWithExpiredDate =
      'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L898902C36UTO7408122F1204159ZE184226B<<<<<10';
    expiredPassport.mrz = mrzWithExpiredDate.slice(0, 57) + '120415' + mrzWithExpiredDate.slice(63);

    expect(isDocumentValidForProving(mockMetadata, expiredPassport)).toBe(false);
  });

  it('returns true if getDocumentAttributes throws error', () => {
    const invalidDocument = {
      documentType: 'passport',
      documentCategory: 'passport',
      mock: false,
    } as any;

    expect(isDocumentValidForProving(mockMetadata, invalidDocument)).toBe(true);
  });
});

describe('pickBestDocumentToSelect', () => {
  // MRZ with expiry date 501231 (December 31, 2050)
  const validPassport: PassportData = {
    mrz: 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L898902C36UTO7408122F5012319ZE184226B<<<<<10',
    dsc: 'mock-dsc',
    eContent: [1, 2, 3],
    signedAttr: [1, 2, 3],
    encryptedDigest: [1, 2, 3],
    documentType: 'passport',
    documentCategory: 'passport',
    mock: false,
  };

  // MRZ with expiry date 120415 (April 15, 2012 - expired)
  const expiredPassport: PassportData = {
    ...validPassport,
    mrz: 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L898902C36UTO7408122F1204159ZE184226B<<<<<10',
  };

  it('returns undefined for empty catalog', () => {
    const catalog: DocumentCatalog = {
      documents: [],
    };
    expect(pickBestDocumentToSelect(catalog, {})).toBeUndefined();
  });

  it('returns currently selected document if valid', () => {
    const metadata: DocumentMetadata = {
      id: 'doc1',
      documentType: 'passport',
      documentCategory: 'passport',
      data: 'data1',
      mock: false,
    };

    const catalog: DocumentCatalog = {
      documents: [metadata],
      selectedDocumentId: 'doc1',
    };

    const documents = {
      doc1: { data: validPassport, metadata },
    };

    expect(pickBestDocumentToSelect(catalog, documents)).toBe('doc1');
  });

  it('returns first valid document if currently selected is expired', () => {
    const expiredMetadata: DocumentMetadata = {
      id: 'doc1',
      documentType: 'passport',
      documentCategory: 'passport',
      data: 'data1',
      mock: false,
    };

    const validMetadata: DocumentMetadata = {
      id: 'doc2',
      documentType: 'passport',
      documentCategory: 'passport',
      data: 'data2',
      mock: false,
    };

    const catalog: DocumentCatalog = {
      documents: [expiredMetadata, validMetadata],
      selectedDocumentId: 'doc1',
    };

    const documents = {
      doc1: { data: expiredPassport, metadata: expiredMetadata },
      doc2: { data: validPassport, metadata: validMetadata },
    };

    expect(pickBestDocumentToSelect(catalog, documents)).toBe('doc2');
  });

  it('returns first valid document if no document is selected', () => {
    const metadata1: DocumentMetadata = {
      id: 'doc1',
      documentType: 'passport',
      documentCategory: 'passport',
      data: 'data1',
      mock: false,
    };

    const metadata2: DocumentMetadata = {
      id: 'doc2',
      documentType: 'passport',
      documentCategory: 'passport',
      data: 'data2',
      mock: false,
    };

    const catalog: DocumentCatalog = {
      documents: [metadata1, metadata2],
    };

    const documents = {
      doc1: { data: validPassport, metadata: metadata1 },
      doc2: { data: validPassport, metadata: metadata2 },
    };

    expect(pickBestDocumentToSelect(catalog, documents)).toBe('doc1');
  });

  it('returns undefined if all documents are expired', () => {
    const metadata: DocumentMetadata = {
      id: 'doc1',
      documentType: 'passport',
      documentCategory: 'passport',
      data: 'data1',
      mock: false,
    };

    const catalog: DocumentCatalog = {
      documents: [metadata],
    };

    const documents = {
      doc1: { data: expiredPassport, metadata },
    };

    expect(pickBestDocumentToSelect(catalog, documents)).toBeUndefined();
  });

  it('selects mock document if it is the only option', () => {
    const mockMetadata: DocumentMetadata = {
      id: 'doc1',
      documentType: 'passport',
      documentCategory: 'passport',
      data: 'mock-data',
      mock: true,
    };

    const catalog: DocumentCatalog = {
      documents: [mockMetadata],
    };

    const mockPassport: PassportData = {
      ...validPassport,
      mock: true,
    };

    const documents = {
      doc1: { data: mockPassport, metadata: mockMetadata },
    };

    expect(pickBestDocumentToSelect(catalog, documents)).toBe('doc1');
  });

  it('prefers selected document even if it is mock', () => {
    const mockMetadata: DocumentMetadata = {
      id: 'mock1',
      documentType: 'passport',
      documentCategory: 'passport',
      data: 'mock-data',
      mock: true,
    };

    const realMetadata: DocumentMetadata = {
      id: 'real1',
      documentType: 'passport',
      documentCategory: 'passport',
      data: 'real-data',
      mock: false,
    };

    const catalog: DocumentCatalog = {
      documents: [mockMetadata, realMetadata],
      selectedDocumentId: 'mock1',
    };

    const mockPassport: PassportData = {
      ...validPassport,
      mock: true,
    };

    const documents = {
      mock1: { data: mockPassport, metadata: mockMetadata },
      real1: { data: validPassport, metadata: realMetadata },
    };

    expect(pickBestDocumentToSelect(catalog, documents)).toBe('mock1');
  });
});
