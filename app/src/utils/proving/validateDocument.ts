// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { DocumentCategory, PassportData } from '@selfxyz/common/types';
import { isUserRegistered } from '@selfxyz/common/utils/passports/validate';
import type {
  PassportValidationCallbacks,
  SelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import { isPassportDataValid } from '@selfxyz/mobile-sdk-alpha';
import { DocumentEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  fetchAllTreesAndCircuits,
  getCommitmentTree,
} from '@selfxyz/mobile-sdk-alpha/stores';

import {
  getAllDocumentsDirectlyFromKeychain,
  loadPassportDataAndSecret,
  loadSelectedDocumentDirectlyFromKeychain,
  setSelectedDocument,
  storePassportData,
  updateDocumentRegistrationState,
} from '@/providers/passportDataProvider';
import analytics from '@/utils/analytics';

const { trackEvent } = analytics();

/**
 * This function checks and updates registration states for all documents and updates the `isRegistered`.
 */
export async function checkAndUpdateRegistrationStates(
  selfClient: SelfClient,
): Promise<void> {
  const allDocuments = await getAllDocumentsDirectlyFromKeychain();

  for (const documentId of Object.keys(allDocuments)) {
    try {
      await setSelectedDocument(documentId);
      const selectedDocument = await loadSelectedDocumentDirectlyFromKeychain();
      if (!selectedDocument) continue;
      let { data: passportData } = selectedDocument;
      // Track whether any specific failure callback fired to avoid duplicate generic events
      let anyFailureReported = false;
      const logValidationError = (
        error: string,
        data?: PassportData,
        additionalContext?: Record<string, unknown>,
      ) => {
        anyFailureReported = true;
        trackEvent(DocumentEvents.VALIDATE_DOCUMENT_FAILED, {
          error: 'Passport data is not valid',
          documentId,
          mock: data?.mock,
          documentCategory: data?.documentCategory,
          ...additionalContext,
        });
      };
      let isValid = false;
      try {
        const callbacks: PassportValidationCallbacks = {
          onPassportDataNull: () => logValidationError('passport_data_null'),
          onPassportMetadataNull: (d: PassportData) =>
            logValidationError('passport_metadata_null', d),
          onDg1HashFunctionNull: (d: PassportData) =>
            logValidationError('dg1_hash_function_null', d),
          onEContentHashFunctionNull: (d: PassportData) =>
            logValidationError('econtent_hash_function_null', d),
          onSignedAttrHashFunctionNull: (d: PassportData) =>
            logValidationError('signed_attr_hash_function_null', d),
          onDg1HashMismatch: (d: PassportData) =>
            logValidationError('dg1_hash_mismatch', d),
          onUnsupportedHashAlgorithm: (
            field: 'dg1' | 'eContent' | 'signedAttr',
            value: string,
            data: PassportData,
          ) => {
            logValidationError(`unsupported_hash_algorithm_${field}`, data, {
              unsupportedAlgorithm: value,
              field: field,
            });
          },
          onDg1HashMissing: (d: PassportData) =>
            logValidationError('dg1_hash_missing', d),
        };
        isValid = isPassportDataValid(passportData, callbacks);
      } catch (error) {
        logValidationError('validation_threw', passportData);
        console.warn(
          `Validation threw exception for document ${documentId}:`,
          error,
        );
      }
      if (!isValid) {
        if (!anyFailureReported) {
          trackEvent(DocumentEvents.VALIDATE_DOCUMENT_FAILED, {
            error: 'Passport data is not valid',
            documentId,
          });
        }
        console.warn(`Skipping invalid document ${documentId}`);
        continue;
      }
      const migratedPassportData = migratePassportData(passportData);
      if (migratedPassportData !== passportData) {
        await storePassportData(migratedPassportData);
        passportData = migratedPassportData;
      }
      const environment = migratedPassportData.mock ? 'stg' : 'prod';
      const documentCategory = migratedPassportData.documentCategory;
      const authorityKeyIdentifier =
        migratedPassportData.dsc_parsed?.authorityKeyIdentifier;
      if (!authorityKeyIdentifier) {
        trackEvent(DocumentEvents.VALIDATE_DOCUMENT_FAILED, {
          error: 'Authority key identifier is null',
          documentId,
          documentCategory,
          mock: migratedPassportData.mock,
        });
        console.warn(
          `Skipping document ${documentId} - no authority key identifier`,
        );
        continue;
      }
      await fetchAllTreesAndCircuits(
        selfClient,
        documentCategory,
        environment,
        authorityKeyIdentifier,
      );
      const passportDataAndSecret = await loadPassportDataAndSecret();
      if (!passportDataAndSecret) {
        console.warn(
          `Skipping document ${documentId} - no passport data and secret`,
        );
        continue;
      }

      const { secret } = JSON.parse(passportDataAndSecret);
      const isRegistered = await isUserRegistered(
        migratedPassportData,
        secret,
        (docCategory: DocumentCategory) =>
          getCommitmentTree(selfClient, docCategory),
      );

      // Update the registration state in the document metadata
      await updateDocumentRegistrationState(documentId, isRegistered);

      if (isRegistered) {
        trackEvent(DocumentEvents.DOCUMENT_VALIDATED, {
          documentId,
          documentCategory,
          mock: migratedPassportData.mock,
        });
      }

      if (__DEV__)
        console.log(
          `Updated registration state for document ${documentId}: ${isRegistered}`,
        );
    } catch (error) {
      console.error(
        `Error checking registration state for document ${documentId}: ${error}`,
      );
      trackEvent(DocumentEvents.VALIDATE_DOCUMENT_FAILED, {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId,
      });
    }
  }

  if (__DEV__) console.log('Registration state check and update completed');
}

// UNUSED?

type MigratedPassportData = Omit<PassportData, 'documentCategory' | 'mock'> & {
  documentCategory?: PassportData['documentCategory'];
  mock?: PassportData['mock'];
};

export function migratePassportData(passportData: PassportData): PassportData {
  const migratedData: MigratedPassportData = { ...passportData };

  const existingDocumentType = migratedData.documentType;
  const inferredMock =
    migratedData.mock ?? existingDocumentType?.startsWith('mock');
  const inferredCategory =
    migratedData.documentCategory ??
    (existingDocumentType?.includes('passport') ? 'passport' : 'id_card');

  const normalizedDocumentType = existingDocumentType ?? 'passport';
  const normalizedMock = inferredMock ?? false;
  const normalizedCategory =
    inferredCategory ??
    (normalizedDocumentType.includes('passport') ? 'passport' : 'id_card');

  const normalizedData: PassportData = {
    ...migratedData,
    documentType: normalizedDocumentType,
    mock: normalizedMock,
    documentCategory: normalizedCategory,
  };

  return normalizedData;
}
