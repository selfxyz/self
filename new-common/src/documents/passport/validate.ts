import { poseidon2, poseidon5 } from 'poseidon-lite';
import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { API_URL, API_URL_STAGING } from '../../foundation/constants/network.js';
import { parseCertificateSimple } from '../../certificates/parsing/parseCertificateSimple.js';
import { hash, packBytesAndPoseidon } from '../../crypto/hash/index.js';
import { getLeafDscTree } from '../../trees/index.js';
import type {
  DeployedCircuits,
  DocumentCategory,
  IDDocument,
  PassportData,
} from '../../foundation/types/document.js';
import { createDocument } from '../factory.js';
import { formatMrz } from './format.js';

export type AlternativeCSCA = Record<string, string>;

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
  },
): Promise<{
  status: PassportSupportStatus;
  details: string;
}> {
  const deployedCircuits = opts.getDeployedCircuits(passportData.documentCategory);
  const doc = createDocument(passportData);

  if (passportData.documentCategory === 'aadhaar' || passportData.documentCategory === 'kyc') {
    const { isValid, circuitName } = doc.isValidRegisterCircuit(deployedCircuits);
    if (!isValid) {
      return { status: 'registration_circuit_not_supported', details: circuitName! };
    }
    return { status: 'passport_supported', details: circuitName! };
  }

  const passportMetadata = (passportData as PassportData).passportMetadata;
  if (!passportMetadata) {
    console.warn('Passport metadata is null');
    return { status: 'passport_metadata_missing', details: (passportData as PassportData).dsc };
  }
  if (!passportMetadata.cscaFound) {
    console.warn('CSCA not found');
    return { status: 'csca_not_found', details: (passportData as PassportData).dsc };
  }

  const { isValid: isRegisterValid, circuitName: registerCircuitName } =
    doc.isValidRegisterCircuit(deployedCircuits);
  if (!isRegisterValid) {
    return { status: 'registration_circuit_not_supported', details: registerCircuitName! };
  }

  const { isValid: isDscValid, circuitName: dscCircuitName } =
    doc.isValidDscCircuit(deployedCircuits);
  if (!isDscValid) {
    console.warn('DSC circuit not supported:', dscCircuitName);
    return { status: 'dsc_circuit_not_supported', details: dscCircuitName! };
  }

  return { status: 'passport_supported', details: dscCircuitName! };
}

export async function checkIfPassportDscIsInTree(
  passportData: IDDocument,
  dscTree: string,
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

function generateCommitmentInApp(
  secret: string,
  attestation_id: string,
  passportData: PassportData,
  alternativeCSCA: AlternativeCSCA,
) {
  const dg1_packed_hash = packBytesAndPoseidon(formatMrz(passportData.mrz));
  const eContent_packed_hash = packBytesAndPoseidon(
    (
      hash(
        passportData.passportMetadata!.eContentHashFunction,
        Array.from(passportData.eContent),
        'bytes',
      ) as number[]
    ).map((byte) => byte & 0xff),
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

export async function isDocumentNullified(passportData: IDDocument) {
  const doc = createDocument(passportData);
  const nullifier = doc.generateNullifier();
  const nullifierHex = `0x${BigInt(nullifier).toString(16)}`;
  const attestationId = doc.getAttestationIdHex();

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
    const error = e instanceof Error ? e : new Error(String(e));
    clearTimeout(t);
    throw new Error(
      `isDocumentNullified request failed: ${error.name} ${error.message} \n ${error.stack}`,
    );
  }
}

export async function isUserRegistered(
  documentData: IDDocument,
  secret: string,
  getCommitmentTree: (docCategory: DocumentCategory) => string,
) {
  if (!documentData) return false;

  const doc = createDocument(documentData);
  const commitment = doc.generateCommitment(secret);

  const serializedTree = getCommitmentTree(documentData.documentCategory);
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
  },
): Promise<{ isRegistered: boolean; csca: string | null }> {
  if (!passportData) {
    console.error('Passport data is null');
    return { isRegistered: false, csca: null };
  }

  const document: DocumentCategory = passportData.documentCategory;
  let commitment_list: string[];
  let csca_list: string[];

  if (document === 'kyc' || document === 'aadhaar') {
    const isRegistered = await isUserRegistered(passportData, secret, getCommitmentTree);
    return { isRegistered, csca: null };
  }

  const doc = createDocument(passportData);
  const alternativeCSCA = getAltCSCA(document);
  const result = generateCommitmentInApp(
    secret,
    doc.getAttestationId(),
    passportData as PassportData,
    alternativeCSCA,
  );
  commitment_list = result.commitment_list;
  csca_list = result.csca_list;

  if (commitment_list.length === 0) {
    const errorMsg = 'No valid CSCA certificates could be parsed from alternativeCSCA';
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

  const warnMsg = `None of the following CSCA correspond to the commitment: ${csca_list}`;
  console.warn(warnMsg);
  return { isRegistered: false, csca: null };
}
