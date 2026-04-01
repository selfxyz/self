// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IDDocument } from '@selfxyz/common';

import {
  finalizeRecoveredDocumentRegistration,
  validateRecoverySecretForDocument,
} from '../../src/proving/recoveryValidation';
import type { SelfClient } from '../../src/types/public';

const isUserRegisteredWithAlternativeCSCAMock = vi.fn();
const markCurrentDocumentAsRegisteredMock = vi.fn();
const restorePassportDataWithRightCSCAmock = vi.fn();
const storePassportDataMock = vi.fn();
const updateDocumentRegistrationStateMock = vi.fn();

vi.mock('@selfxyz/common/utils/passports/validate', () => ({
  isUserRegisteredWithAlternativeCSCA: (...args: unknown[]) => isUserRegisteredWithAlternativeCSCAMock(...args),
}));

vi.mock('../../src/documents/utils', () => ({
  markCurrentDocumentAsRegistered: (...args: unknown[]) => markCurrentDocumentAsRegisteredMock(...args),
  reStorePassportDataWithRightCSCA: (...args: unknown[]) => restorePassportDataWithRightCSCAmock(...args),
  storePassportData: (...args: unknown[]) => storePassportDataMock(...args),
  updateDocumentRegistrationState: (...args: unknown[]) => updateDocumentRegistrationStateMock(...args),
}));

const documentFixture = {
  documentCategory: 'passport',
  documentType: 'passport',
} as IDDocument;

function createSelfClient() {
  return {
    loadDocumentCatalog: async () => ({
      selectedDocumentId: 'doc-1',
      documents: [],
    }),
    getProtocolState: () => ({
      passport: {
        commitment_tree: 'passport-tree',
        alternative_csca: {
          passportAlt: 'passportAlt',
        },
      },
      id_card: {
        commitment_tree: 'id-tree',
        alternative_csca: {},
      },
      aadhaar: {
        commitment_tree: 'aadhaar-tree',
        public_keys: ['aadhaar-pub-1'],
      },
      kyc: {
        commitment_tree: 'kyc-tree',
        public_keys: ['kyc-pub-1', 'kyc-pub-2'],
      },
    }),
  } as unknown as SelfClient;
}

describe('validateRecoverySecretForDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns registered for a matching secret', async () => {
    isUserRegisteredWithAlternativeCSCAMock.mockResolvedValue({
      isRegistered: true,
      csca: 'matching-csca',
    });

    const result = await validateRecoverySecretForDocument(createSelfClient(), documentFixture, 'matching-secret');

    expect(result).toEqual({
      isRegistered: true,
      csca: 'matching-csca',
    });
    expect(isUserRegisteredWithAlternativeCSCAMock).toHaveBeenCalledWith(
      documentFixture,
      'matching-secret',
      expect.objectContaining({
        getCommitmentTree: expect.any(Function),
        getAltCSCA: expect.any(Function),
      }),
    );
  });

  it('returns not registered for a non-matching secret', async () => {
    isUserRegisteredWithAlternativeCSCAMock.mockResolvedValue({
      isRegistered: false,
    });

    const result = await validateRecoverySecretForDocument(createSelfClient(), documentFixture, 'wrong-secret');

    expect(result).toEqual({
      isRegistered: false,
      csca: undefined,
    });
  });

  it('uses public keys for kyc and aadhaar document categories', async () => {
    isUserRegisteredWithAlternativeCSCAMock.mockImplementation(async (_document, _secret, callbacks) => {
      expect(callbacks.getCommitmentTree('kyc')).toBe('kyc-tree');
      expect(callbacks.getCommitmentTree('aadhaar')).toBe('aadhaar-tree');
      expect(callbacks.getAltCSCA('kyc')).toEqual({
        'kyc-pub-1': 'kyc-pub-1',
        'kyc-pub-2': 'kyc-pub-2',
      });
      expect(callbacks.getAltCSCA('aadhaar')).toEqual({
        'aadhaar-pub-1': 'aadhaar-pub-1',
      });
      expect(callbacks.getAltCSCA('passport')).toEqual({
        passportAlt: 'passportAlt',
      });

      return {
        isRegistered: true,
        csca: 'matching-csca',
      };
    });

    await validateRecoverySecretForDocument(createSelfClient(), documentFixture, 'matching-secret');

    expect(isUserRegisteredWithAlternativeCSCAMock).toHaveBeenCalledTimes(1);
  });
});

describe('finalizeRecoveredDocumentRegistration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rolls back document state when registration marking fails after a CSCA restore', async () => {
    restorePassportDataWithRightCSCAmock.mockImplementation(async (_client, document) => {
      document.passportMetadata = {
        ...(document.passportMetadata ?? {}),
        csca: 'new-csca',
      };
    });
    markCurrentDocumentAsRegisteredMock.mockRejectedValue(new Error('catalog save failed'));

    const document = {
      ...documentFixture,
      passportMetadata: {
        csca: 'old-csca',
      },
    } as IDDocument;

    await expect(finalizeRecoveredDocumentRegistration(createSelfClient(), document, 'new-csca')).rejects.toThrow(
      'catalog save failed',
    );

    expect(restorePassportDataWithRightCSCAmock).toHaveBeenCalledWith(expect.anything(), document, 'new-csca');
    expect(storePassportDataMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        passportMetadata: expect.objectContaining({
          csca: 'old-csca',
        }),
      }),
    );
    expect(updateDocumentRegistrationStateMock).toHaveBeenCalledWith(expect.anything(), 'doc-1', false);
  });

  it('does not attempt document restore when mark fails without a CSCA override', async () => {
    markCurrentDocumentAsRegisteredMock.mockRejectedValue(new Error('catalog save failed'));

    await expect(finalizeRecoveredDocumentRegistration(createSelfClient(), documentFixture)).rejects.toThrow(
      'catalog save failed',
    );

    expect(restorePassportDataWithRightCSCAmock).not.toHaveBeenCalled();
    expect(storePassportDataMock).not.toHaveBeenCalled();
    expect(updateDocumentRegistrationStateMock).toHaveBeenCalledWith(expect.anything(), 'doc-1', false);
  });
});
