// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { PassportData } from '@selfxyz/common/types';
import { isUserRegistered } from '@selfxyz/common/utils/passports/validate';
import type { PassportValidationCallbacks } from '@selfxyz/mobile-sdk-alpha';
import { isPassportDataValid } from '@selfxyz/mobile-sdk-alpha';
import { DocumentEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import { useProtocolStore } from '@selfxyz/mobile-sdk-alpha/stores';

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
export async function checkAndUpdateRegistrationStates(): Promise<void> {
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
        additionalContext?: Record<string, any>,
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
      await useProtocolStore
        .getState()
        [documentCategory].fetch_all(environment, authorityKeyIdentifier);
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
        docType => useProtocolStore.getState()[docType].commitment_tree,
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

interface MigratedPassportData extends Omit<PassportData, 'documentType'> {
  documentType?: string;
}

export function migratePassportData(passportData: PassportData): PassportData {
  const migratedData: MigratedPassportData = { ...passportData };
  if (!('documentCategory' in migratedData) || !('mock' in migratedData)) {
    const documentType = (migratedData as any).documentType;
    if (documentType) {
      (migratedData as any).mock = documentType.startsWith('mock');
      (migratedData as any).documentCategory = documentType.includes('passport')
        ? 'passport'
        : 'id_card';
    } else {
      (migratedData as any).documentType = 'passport';
      (migratedData as any).documentCategory = 'passport';
      (migratedData as any).mock = false;
    }
    // console.log('Migrated passport data:', migratedData);
  }
  return migratedData as PassportData;
}
