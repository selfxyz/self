// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { poseidon2, poseidon5 } from 'poseidon-lite';
import { LeanIMT } from '@openpassport/zk-kit-lean-imt';

import {
  API_URL,
  API_URL_STAGING,
  ID_CARD_ATTESTATION_ID,
  PASSPORT_ATTESTATION_ID,
} from '@selfxyz/common/constants';
import type { DocumentCategory, PassportData } from '@selfxyz/common/types';
import { parseCertificateSimple } from '@selfxyz/common/utils/certificates/parseSimple';
import { getCircuitNameFromPassportData } from '@selfxyz/common/utils/circuitNames';
import { packBytesAndPoseidon } from '@selfxyz/common/utils/hash/poseidon';
import { hash } from '@selfxyz/common/utils/hash/sha';
import { formatMrz } from '@selfxyz/common/utils/passportFormat';
import {
  generateCommitment,
  generateNullifier,
} from '@selfxyz/common/utils/passports';
import { getLeafDscTree } from '@selfxyz/common/utils/trees';
import type { PassportValidationCallbacks } from '@selfxyz/mobile-sdk-alpha';
import { isPassportDataValid } from '@selfxyz/mobile-sdk-alpha';

import { DocumentEvents } from '@/consts/analytics';
import {
  getAllDocuments,
  loadDocumentCatalog,
  loadPassportDataAndSecret,
  loadSelectedDocument,
  setSelectedDocument,
  storePassportData,
  updateDocumentRegistrationState,
} from '@/providers/passportDataProvider';
import { useProtocolStore } from '@/stores/protocolStore';
import analytics from '@/utils/analytics';

const { trackEvent } = analytics();

export type PassportSupportStatus =
  | 'passport_metadata_missing'
  | 'csca_not_found'
  | 'registration_circuit_not_supported'
  | 'dsc_circuit_not_supported'
  | 'passport_supported';

/**
 * This function checks and updates registration states for all documents and updates the `isRegistered`.
 */
export async function checkAndUpdateRegistrationStates(): Promise<void> {
  const allDocuments = await getAllDocuments();
  for (const documentId of Object.keys(allDocuments)) {
    try {
      await setSelectedDocument(documentId);
      const selectedDocument = await loadSelectedDocument();
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
      const isRegistered = await isUserRegistered(migratedPassportData, secret);

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

export async function checkIfPassportDscIsInTree(
  passportData: PassportData,
  dscTree: string,
): Promise<boolean> {
  const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
  const tree = LeanIMT.import(hashFunction, dscTree);
  const leaf = getLeafDscTree(
    passportData.dsc_parsed!,
    passportData.csca_parsed!,
  );
  const index = tree.indexOf(BigInt(leaf));
  if (index === -1) {
    console.warn('DSC not found in the tree');
    return false;
  }
  return true;
}

export async function checkPassportSupported(
  passportData: PassportData,
): Promise<{
  status: PassportSupportStatus;
  details: string;
}> {
  const passportMetadata = passportData.passportMetadata;
  const document: DocumentCategory = passportData.documentCategory;
  if (!passportMetadata) {
    console.warn('Passport metadata is null');
    return { status: 'passport_metadata_missing', details: passportData.dsc };
  }
  if (!passportMetadata.cscaFound) {
    console.warn('CSCA not found');
    return { status: 'csca_not_found', details: passportData.dsc };
  }
  const circuitNameRegister = getCircuitNameFromPassportData(
    passportData,
    'register',
  );
  const deployedCircuits =
    useProtocolStore.getState()[document].deployed_circuits; // change this to the document type
  if (
    !circuitNameRegister ||
    !(
      deployedCircuits.REGISTER.includes(circuitNameRegister) ||
      deployedCircuits.REGISTER_ID.includes(circuitNameRegister)
    )
  ) {
    return {
      status: 'registration_circuit_not_supported',
      details: circuitNameRegister,
    };
  }
  const circuitNameDsc = getCircuitNameFromPassportData(passportData, 'dsc');
  if (
    !circuitNameDsc ||
    !(
      deployedCircuits.DSC.includes(circuitNameDsc) ||
      deployedCircuits.DSC_ID.includes(circuitNameDsc)
    )
  ) {
    console.warn('DSC circuit not supported:', circuitNameDsc);
    return { status: 'dsc_circuit_not_supported', details: circuitNameDsc };
  }
  return { status: 'passport_supported', details: 'null' };
}

export function generateCommitmentInApp(
  secret: string,
  attestation_id: string,
  passportData: PassportData,
  alternativeCSCA: Record<string, string>,
) {
  const dg1_packed_hash = packBytesAndPoseidon(formatMrz(passportData.mrz));
  const eContent_packed_hash = packBytesAndPoseidon(
    (
      hash(
        passportData.passportMetadata!.eContentHashFunction,
        Array.from(passportData.eContent),
        'bytes',
      ) as number[]
    )
      // eslint-disable-next-line no-bitwise
      .map(byte => byte & 0xff),
  );

  const csca_list: string[] = [];
  const commitment_list: string[] = [];

  for (const [cscaKey, cscaValue] of Object.entries(alternativeCSCA)) {
    try {
      const formattedCsca = formatCSCAPem(cscaValue);
      const cscaParsed = parseCertificateSimple(formattedCsca);

      const commitment = poseidon5([
        secret,
        attestation_id,
        dg1_packed_hash,
        eContent_packed_hash,
        getLeafDscTree(passportData.dsc_parsed!, cscaParsed),
      ]).toString();

      csca_list.push(formatCSCAPem(cscaValue));
      commitment_list.push(commitment);
    } catch (error) {
      console.warn(
        `Failed to parse CSCA certificate for key ${cscaKey}:`,
        error,
      );
    }
  }

  if (commitment_list.length === 0) {
    console.error('No valid CSCA certificates found in alternativeCSCA');
  }

  return { commitment_list, csca_list };
}

function formatCSCAPem(cscaPem: string): string {
  let cleanedPem = cscaPem.trim();

  if (!cleanedPem.includes('-----BEGIN CERTIFICATE-----')) {
    cleanedPem = cleanedPem.replace(/[^A-Za-z0-9+/=]/g, '');
    try {
      Buffer.from(cleanedPem, 'base64');
    } catch (error) {
      throw new Error(`Invalid base64 certificate data: ${error}`);
    }
    cleanedPem = `-----BEGIN CERTIFICATE-----\n${cleanedPem}\n-----END CERTIFICATE-----`;
  }
  return cleanedPem;
}

export async function hasAnyValidRegisteredDocument(): Promise<boolean> {
  try {
    const catalog = await loadDocumentCatalog();
    return catalog.documents.some(doc => doc.isRegistered === true);
  } catch (error) {
    console.error('Error loading document catalog:', error);
    return false;
  }
}

export async function isDocumentNullified(passportData: PassportData) {
  const nullifier = generateNullifier(passportData);
  const nullifierHex = `0x${BigInt(nullifier).toString(16)}`;
  const attestationId =
    passportData.documentCategory === 'passport'
      ? '0x0000000000000000000000000000000000000000000000000000000000000001'
      : '0x0000000000000000000000000000000000000000000000000000000000000002';
  console.log('checking for nullifier', nullifierHex, attestationId);
  const baseUrl = passportData.mock === false ? API_URL : API_URL_STAGING;
  const response = await fetch(
    `${baseUrl}/is-nullifier-onchain-with-attestation-id`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nullifier: nullifierHex,
        attestation_id: attestationId,
      }),
    },
  );
  const data = await response.json();
  console.log('isDocumentNullified', data);
  return data.data;
}

export async function isUserRegistered(
  passportData: PassportData,
  secret: string,
) {
  if (!passportData) {
    return false;
  }
  const attestationId =
    passportData.documentCategory === 'passport'
      ? PASSPORT_ATTESTATION_ID
      : ID_CARD_ATTESTATION_ID;
  const commitment = generateCommitment(secret, attestationId, passportData);
  const document: DocumentCategory = passportData.documentCategory;
  const serializedTree = useProtocolStore.getState()[document].commitment_tree;
  const tree = LeanIMT.import((a, b) => poseidon2([a, b]), serializedTree);
  const index = tree.indexOf(BigInt(commitment));
  return index !== -1;
}

export async function isUserRegisteredWithAlternativeCSCA(
  passportData: PassportData,
  secret: string,
): Promise<{ isRegistered: boolean; csca: string | null }> {
  if (!passportData) {
    console.error('Passport data is null');
    return { isRegistered: false, csca: null };
  }
  const document: DocumentCategory = passportData.documentCategory;
  const alternativeCSCA =
    useProtocolStore.getState()[document].alternative_csca;
  const { commitment_list, csca_list } = generateCommitmentInApp(
    secret,
    document === 'passport' ? PASSPORT_ATTESTATION_ID : ID_CARD_ATTESTATION_ID,
    passportData,
    alternativeCSCA,
  );

  if (commitment_list.length === 0) {
    console.error(
      'No valid CSCA certificates could be parsed from alternativeCSCA',
    );
    return { isRegistered: false, csca: null };
  }

  const serializedTree = useProtocolStore.getState()[document].commitment_tree;
  const tree = LeanIMT.import((a, b) => poseidon2([a, b]), serializedTree);
  for (let i = 0; i < commitment_list.length; i++) {
    const commitment = commitment_list[i];
    const index = tree.indexOf(BigInt(commitment));
    if (index !== -1) {
      return { isRegistered: true, csca: csca_list[i] };
    }
  }
  console.warn(
    'None of the following CSCA correspond to the commitment:',
    csca_list,
  );
  return { isRegistered: false, csca: null };
}

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
