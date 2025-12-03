// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { poseidon2, poseidon5 } from 'poseidon-lite';

import {
  API_URL,
  API_URL_STAGING,
  ID_CARD_ATTESTATION_ID,
  PASSPORT_ATTESTATION_ID,
} from '../../constants/index.js';
import { parseCertificateSimple } from '../../utils/certificate_parsing/parseSimple.js';
import { getCircuitNameFromPassportData } from '../../utils/circuits/circuitsName.js';
import { packBytesAndPoseidon } from '../../utils/hash/poseidon.js';
import { hash } from '../../utils/hash/sha.js';
import { formatMrz } from '../../utils/passports/format.js';
import { getLeafDscTree } from '../../utils/trees.js';
import {
  computeCommitment,
  computePackedCommitment,
  nullifierHash,
  processQRDataSimple,
} from '../aadhaar/mockData.js';
import {
  AadhaarData,
  AttestationIdHex,
  type DeployedCircuits,
  type DocumentCategory,
  IDDocument,
  type PassportData,
} from '../types.js';
import { generateCommitment, generateNullifier } from './passport.js';

import { LeanIMT } from '@openpassport/zk-kit-lean-imt';

export type AlternativeCSCA = Record<string, string>;

function validateRegistrationCircuit(
  passportData: IDDocument,
  deployedCircuits: DeployedCircuits
): { isValid: boolean; circuitName: string | null } {
  let circuitNameRegister = getCircuitNameFromPassportData(
    passportData as PassportData,
    'register'
  );

  const isValid =
    circuitNameRegister &&
    (deployedCircuits.REGISTER.includes(circuitNameRegister) ||
      deployedCircuits.REGISTER_ID.includes(circuitNameRegister) ||
      deployedCircuits.REGISTER_AADHAAR.includes(circuitNameRegister));
  return { isValid: !!isValid, circuitName: circuitNameRegister };
}

function validateDscCircuit(
  passportData: PassportData,
  deployedCircuits: DeployedCircuits
): { isValid: boolean; circuitName: string | null } {
  const circuitNameDsc = getCircuitNameFromPassportData(passportData, 'dsc');
  const isValid =
    circuitNameDsc &&
    (deployedCircuits.DSC.includes(circuitNameDsc) ||
      deployedCircuits.DSC_ID.includes(circuitNameDsc));
  return { isValid: !!isValid, circuitName: circuitNameDsc };
}

export type PassportSupportStatus =
  | 'passport_metadata_missing'
  | 'csca_not_found'
  | 'registration_circuit_not_supported'
  | 'dsc_circuit_not_supported'
  | 'passport_supported';

export async function checkDocumentSupported(
  passportData: IDDocument,
  opts: {
    getDeployedCircuits: (docCategory: DocumentCategory) => DeployedCircuits;
  }
): Promise<{
  status: PassportSupportStatus;
  details: string;
}> {
  const deployedCircuits = opts.getDeployedCircuits(passportData.documentCategory);
  if (passportData.documentCategory === 'aadhaar') {
    const { isValid, circuitName } = validateRegistrationCircuit(passportData, deployedCircuits);

    if (!isValid) {
      return {
        status: 'registration_circuit_not_supported',
        details: circuitName,
      };
    }
    return { status: 'passport_supported', details: circuitName };
  }

  const passportMetadata = passportData.passportMetadata;
  if (!passportMetadata) {
    console.warn('Passport metadata is null');
    return { status: 'passport_metadata_missing', details: passportData.dsc };
  }
  if (!passportMetadata.cscaFound) {
    console.warn('CSCA not found');
    return { status: 'csca_not_found', details: passportData.dsc };
  }

  const { isValid: isRegisterValid, circuitName: registerCircuitName } =
    validateRegistrationCircuit(passportData, deployedCircuits);
  if (!isRegisterValid) {
    return {
      status: 'registration_circuit_not_supported',
      details: registerCircuitName,
    };
  }

  const { isValid: isDscValid, circuitName: dscCircuitName } = validateDscCircuit(
    passportData as PassportData,
    deployedCircuits
  );
  if (!isDscValid) {
    console.warn('DSC circuit not supported:', dscCircuitName);
    return { status: 'dsc_circuit_not_supported', details: dscCircuitName };
  }

  return { status: 'passport_supported', details: dscCircuitName };
}

export async function checkIfPassportDscIsInTree(
  passportData: IDDocument,
  dscTree: string
): Promise<boolean> {
  const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
  const tree = LeanIMT.import(hashFunction, dscTree);
  const leaf = getLeafDscTree(passportData.dsc_parsed!, passportData.csca_parsed!);
  const index = tree.indexOf(BigInt(leaf));
  if (index === -1) {
    console.warn('DSC not found in the tree');
    return false;
  }
  return true;
}
type AadhaarPublicKeys = null | Array<string>;

export function generateCommitmentInApp(
  secret: string,
  attestation_id: string,
  passportData: PassportData,
  alternativeCSCA: AlternativeCSCA
) {
  const dg1_packed_hash = packBytesAndPoseidon(formatMrz(passportData.mrz));
  const eContent_packed_hash = packBytesAndPoseidon(
    (
      hash(
        passportData.passportMetadata!.eContentHashFunction,
        Array.from(passportData.eContent),
        'bytes'
      ) as number[]
    )
      // eslint-disable-next-line no-bitwise
      .map((byte) => byte & 0xff)
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
      console.warn(`Failed to parse CSCA certificate for key ${cscaKey}:`, error);
    }
  }

  if (commitment_list.length === 0) {
    console.error('No valid CSCA certificates found in alternativeCSCA');
  }

  return { commitment_list, csca_list };
}

export function generateCommitmentInAppAadhaar(
  secret: string,
  attestation_id: string,
  passportData: AadhaarData,
  alternativePublicKeys: Record<string, string>
) {
  const nullifier = nullifierHash(passportData.extractedFields);
  const packedCommitment = computePackedCommitment(passportData.extractedFields);
  const { qrHash, photoHash } = processQRDataSimple(passportData.qrData);

  const publicKey_list: string[] = [];
  const commitment_list: string[] = [];

  // For Aadhaar, we can also use the document's own public key
  const allPublicKeys = {
    document_public_key: passportData.publicKey,
    ...alternativePublicKeys,
  };

  for (const [keyName, publicKeyValue] of Object.entries(allPublicKeys)) {
    try {
      const commitment = computeCommitment(
        BigInt(secret),
        BigInt(qrHash),
        nullifier,
        packedCommitment,
        photoHash
      ).toString();

      publicKey_list.push(publicKeyValue);
      commitment_list.push(commitment);
    } catch (error) {
      console.warn(`Failed to process public key for ${keyName}:`, error);
    }
  }

  if (commitment_list.length === 0) {
    console.error('No valid public keys found for Aadhaar');
  }

  return { commitment_list, publicKey_list };
}

export async function isDocumentNullified(passportData: IDDocument) {
  const nullifier = generateNullifier(passportData);
  const nullifierHex = `0x${BigInt(nullifier).toString(16)}`;
  const attestationId =
    passportData.documentCategory === 'passport'
      ? AttestationIdHex.passport
      : passportData.documentCategory === 'aadhaar'
        ? AttestationIdHex.aadhaar
        : AttestationIdHex.id_card;
  console.log('checking for nullifier', nullifierHex, attestationId);
  const baseUrl = passportData.mock === false ? API_URL : API_URL_STAGING;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${baseUrl}/is-nullifier-onchain-with-attestation-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nullifier: nullifierHex, attestation_id: attestationId }),
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!response.ok) {
      throw new Error(`isDocumentNullified non-OK response: ${response.status}`);
    }
    const data = await response.json();
    return Boolean(data?.data);
  } catch (e) {
    const erorr = e instanceof Error ? e : new Error(String(e));
    clearTimeout(t);
    // re throw so our catcher can get this
    throw new Error(
      `isDocumentNullified request failed: ${erorr.name} ${erorr.message} \n ${erorr.stack}`
    );
  }
}

export async function isUserRegistered(
  documentData: PassportData | AadhaarData,
  secret: string,
  getCommitmentTree: (docCategory: DocumentCategory) => string
) {
  if (!documentData) {
    return false;
  }

  const document: DocumentCategory = documentData.documentCategory;
  let commitment: string;

  if (document === 'aadhaar') {
    const aadhaarData = documentData as AadhaarData;
    const nullifier = nullifierHash(aadhaarData.extractedFields);
    const packedCommitment = computePackedCommitment(aadhaarData.extractedFields);
    const { qrHash, photoHash } = processQRDataSimple(aadhaarData.qrData);

    commitment = computeCommitment(
      BigInt(secret),
      BigInt(qrHash),
      nullifier,
      packedCommitment,
      photoHash
    ).toString();

    console.log('commitment', commitment);
  } else {
    const attestationId =
      document === 'passport' ? PASSPORT_ATTESTATION_ID : ID_CARD_ATTESTATION_ID;
    commitment = generateCommitment(secret, attestationId, documentData as PassportData);
  }

  const serializedTree = getCommitmentTree(document);
  const tree = LeanIMT.import((a, b) => poseidon2([a, b]), serializedTree);
  const index = tree.indexOf(BigInt(commitment));
  return index !== -1;
}

export async function isUserRegisteredWithAlternativeCSCA(
  passportData: IDDocument,
  secret: string,
  {
    getCommitmentTree,
    getAltCSCA,
  }: {
    getCommitmentTree: (docCategory: DocumentCategory) => string;
    getAltCSCA: (docCategory: DocumentCategory) => AlternativeCSCA;
  }
): Promise<{ isRegistered: boolean; csca: string | null }> {
  if (!passportData) {
    console.error('Passport data is null');
    return { isRegistered: false, csca: null };
  }
  const document: DocumentCategory = passportData.documentCategory;
  let commitment_list: string[];
  let csca_list: string[];

  if (document === 'aadhaar') {
    // For Aadhaar, use public keys from protocol store instead of CSCA
    const publicKeys = getAltCSCA(document);
    if (!publicKeys || Object.keys(publicKeys).length === 0) {
      console.error('No public keys available for Aadhaar');
      return { isRegistered: false, csca: null };
    }

    // Create alternative public keys object from protocol store
    const alternativePublicKeys: Record<string, string> = {};
    Object.entries(publicKeys).forEach(([key, value], index) => {
      alternativePublicKeys[`public_key_${index}`] = value;
    });

    const result = generateCommitmentInAppAadhaar(
      secret,
      AttestationIdHex.aadhaar,
      passportData as AadhaarData,
      alternativePublicKeys
    );
    commitment_list = result.commitment_list;
    csca_list = result.publicKey_list;
  } else {
    // For passport/id_card, use CSCA certificates
    const alternativeCSCA = getAltCSCA(document);
    const result = generateCommitmentInApp(
      secret,
      document === 'passport' ? PASSPORT_ATTESTATION_ID : ID_CARD_ATTESTATION_ID,
      passportData as PassportData,
      alternativeCSCA
    );
    commitment_list = result.commitment_list;
    csca_list = result.csca_list;
  }

  if (commitment_list.length === 0) {
    const errorMsg =
      document === 'aadhaar'
        ? 'No valid public keys could be processed for Aadhaar'
        : 'No valid CSCA certificates could be parsed from alternativeCSCA';
    console.error(errorMsg);
    return { isRegistered: false, csca: null };
  }

  const serializedTree = getCommitmentTree(document);
  const tree = LeanIMT.import((a, b) => poseidon2([a, b]), serializedTree);

  for (let i = 0; i < commitment_list.length; i++) {
    const commitment = commitment_list[i];
    const index = tree.indexOf(BigInt(commitment));
    if (index !== -1) {
      return { isRegistered: true, csca: csca_list[i] };
    }
  }

  const warnMsg =
    document === 'aadhaar'
      ? `None of the following public keys correspond to the commitment for Aadhaar: ${csca_list}`
      : `None of the following CSCA correspond to the commitment: ${csca_list}`;
  console.warn(warnMsg);
  return { isRegistered: false, csca: null };
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
