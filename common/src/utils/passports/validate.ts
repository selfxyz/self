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
  AttestationIdHex,
  type DeployedCircuits,
  type DocumentCategory,
  type PassportData,
} from '../types.js';
import { generateCommitment, generateNullifier } from './passport.js';

import { LeanIMT } from '@openpassport/zk-kit-lean-imt';

export type PassportSupportStatus =
  | 'passport_metadata_missing'
  | 'csca_not_found'
  | 'registration_circuit_not_supported'
  | 'dsc_circuit_not_supported'
  | 'passport_supported';

export async function checkDocumentSupported(
  passportData: PassportData,
  opts: {
    getDeployedCircuits: (docCategory: DocumentCategory) => DeployedCircuits;
  }
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
  const circuitNameRegister = getCircuitNameFromPassportData(passportData, 'register');
  const deployedCircuits = opts.getDeployedCircuits(passportData.documentCategory);
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

export async function checkIfPassportDscIsInTree(
  passportData: PassportData,
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

type AlternativeCSCA = Record<string, string>;

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

export async function isDocumentNullified(passportData: PassportData) {
  const nullifier = generateNullifier(passportData);
  const nullifierHex = `0x${BigInt(nullifier).toString(16)}`;
  const attestationId =
    passportData.documentCategory === 'passport'
      ? AttestationIdHex.passport
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
  passportData: PassportData,
  secret: string,
  getCommitmentTree: (docCategory: DocumentCategory) => string
) {
  if (!passportData) {
    return false;
  }
  const attestationId =
    passportData.documentCategory === 'passport' ? PASSPORT_ATTESTATION_ID : ID_CARD_ATTESTATION_ID;
  const commitment = generateCommitment(secret, attestationId, passportData);
  const document: DocumentCategory = passportData.documentCategory;
  const serializedTree = getCommitmentTree(document);
  const tree = LeanIMT.import((a, b) => poseidon2([a, b]), serializedTree);
  const index = tree.indexOf(BigInt(commitment));
  return index !== -1;
}

export async function isUserRegisteredWithAlternativeCSCA(
  passportData: PassportData,
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
  const alternativeCSCA = getAltCSCA(document);
  const { commitment_list, csca_list } = generateCommitmentInApp(
    secret,
    document === 'passport' ? PASSPORT_ATTESTATION_ID : ID_CARD_ATTESTATION_ID,
    passportData,
    alternativeCSCA
  );

  if (commitment_list.length === 0) {
    console.error('No valid CSCA certificates could be parsed from alternativeCSCA');
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
  console.warn('None of the following CSCA correspond to the commitment:', csca_list);
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
