// generate a mock id document

import * as asn1 from 'asn1js';
import elliptic from 'elliptic';
import forge from 'node-forge';

import type { hashAlgosTypes } from '../../constants/constants.js';
import { API_URL_STAGING } from '../../constants/constants.js';
import { countries } from '../../constants/countries.js';
import {
  AADHAAR_MOCK_PRIVATE_KEY_PEM,
  AADHAAR_MOCK_PUBLIC_KEY_PEM,
} from '../../mock_certificates/aadhaar/mockAadhaarCert.js';
import { convertByteArrayToBigInt, processQRData } from '../aadhaar/mockData.js';
import { extractQRDataFields } from '../aadhaar/utils.js';
import { getCurveForElliptic } from '../certificate_parsing/curves.js';
import type {
  PublicKeyDetailsECDSA,
  PublicKeyDetailsRSAPSS,
} from '../certificate_parsing/dataStructure.js';
import { parseCertificateSimple } from '../certificate_parsing/parseCertificateSimple.js';
import { getHashLen, hash } from '../hash.js';
import type { AadhaarData, DocumentType, PassportData, SignatureAlgorithm } from '../types.js';
import { genDG1 } from './dg1.js';
import { formatAndConcatenateDataHashes, formatMrz, generateSignedAttr } from './format.js';
import { getMockDSC } from './getMockDSC.js';
import { initPassportDataParsing } from './passport.js';

export interface IdDocInput {
  idType: 'mock_passport' | 'mock_id_card' | 'mock_aadhaar';
  dgHashAlgo?: hashAlgosTypes;
  eContentHashAlgo?: hashAlgosTypes;
  signatureType?: SignatureAlgorithm;
  nationality?: (typeof countries)[keyof typeof countries];
  birthDate?: string;
  expiryDate?: string;
  passportNumber?: string;
  lastName?: string;
  firstName?: string;
  sex?: 'M' | 'F';
  // Aadhaar-specific fields
  pincode?: string; // - not disclosing this so not getting it in CreateMockScreen
  state?: string;
}

const defaultIdDocInput: IdDocInput = {
  idType: 'mock_passport',
  dgHashAlgo: 'sha256',
  eContentHashAlgo: 'sha256',
  signatureType: 'rsa_sha256_65537_2048',
  nationality: countries.UNITED_STATES,
  birthDate: '900101',
  expiryDate: '300101',
  passportNumber: '123456789',
  lastName: undefined,
  firstName: undefined,
  sex: 'M',
  // Aadhaar defaults
  pincode: '110051',
  state: 'Delhi',
};

// Generate mock Aadhaar document
function genMockAadhaarDoc(input: IdDocInput): AadhaarData {
  const name = input.firstName
    ? `${input.firstName} ${input.lastName || ''}`.trim()
    : generateRandomName();

  const gender = input.sex === 'F' ? 'F' : 'M';
  const pincode = input.pincode ?? '110051';
  const state = input.state ?? 'Delhi';
  const dateOfBirth = input.birthDate ?? '01-01-1990';
  console.log('genMockAadhaarDoc', input);
  console.log('dateOfBirth', dateOfBirth);

  // Generate Aadhaar QR data using processQRData
  const qrData = processQRData(
    AADHAAR_MOCK_PRIVATE_KEY_PEM,
    name,
    dateOfBirth,
    gender,
    pincode,
    state,
    new Date().getTime().toString()
  );

  // Convert QR data to string format
  const qrDataString = convertByteArrayToBigInt(qrData.qrDataBytes).toString();
  console.log('qrDataString', qrDataString);

  // Extract signature from the decoded data
  const signatureBytes = qrData.decodedData.slice(
    qrData.decodedData.length - 256,
    qrData.decodedData.length
  );
  const signature = Array.from(signatureBytes);

  console.log('qrData.extractedFields', qrData.extractedFields);

  return {
    documentType: input.idType as DocumentType,
    documentCategory: 'aadhaar',
    mock: true,
    qrData: qrDataString,
    extractedFields: qrData.extractedFields,
    signature,
    publicKey: AADHAAR_MOCK_PUBLIC_KEY_PEM,
    photoHash: qrData.photoHash.toString(),
  };
}

export function genMockIdDoc(
  userInput: Partial<IdDocInput> = {},
  mockDSC?: { dsc: string; privateKeyPem: string }
): PassportData | AadhaarData {
  if (userInput.idType === 'mock_aadhaar') {
    return genMockAadhaarDoc(userInput as IdDocInput);
  }

  const mergedInput: IdDocInput = {
    ...defaultIdDocInput,
    ...userInput,
  };

  mergedInput.lastName = mergedInput.lastName ?? 'DOE';
  mergedInput.firstName = mergedInput.firstName ?? 'JOHN';

  let privateKeyPem: string, dsc: string;
  if (mockDSC) {
    dsc = mockDSC.dsc;
    privateKeyPem = mockDSC.privateKeyPem;
  } else {
    ({ privateKeyPem, dsc } = getMockDSC(mergedInput.signatureType));
  }

  const dg1 = genDG1(mergedInput);
  const dg1_hash = hash(mergedInput.dgHashAlgo, formatMrz(dg1));
  const dataGroupHashes = generateDataGroupHashes(
    dg1_hash as number[],
    getHashLen(mergedInput.dgHashAlgo)
  );
  const eContent = formatAndConcatenateDataHashes(dataGroupHashes, 63);
  const eContentHash = hash(mergedInput.eContentHashAlgo, eContent);
  const signedAttr = generateSignedAttr(eContentHash as number[]);
  const hashAlgo = mergedInput.signatureType.split('_')[1];
  const signature = sign(privateKeyPem, dsc, hashAlgo, signedAttr);
  const signatureBytes = Array.from(signature, (byte) => (byte < 128 ? byte : byte - 256));
  return {
    dsc: dsc,
    mrz: dg1,
    dg2Hash: dataGroupHashes.find(([dgNum]) => dgNum === 2)?.[1] || [],
    eContent: eContent,
    signedAttr: signedAttr,
    encryptedDigest: signatureBytes,
    documentType: mergedInput.idType as DocumentType,
    documentCategory: mergedInput.idType === 'mock_passport' ? 'passport' : 'id_card',
    mock: true,
  };
}

export function genMockIdDocAndInitDataParsing(userInput: Partial<IdDocInput> = {}) {
  return initPassportDataParsing({
    ...(genMockIdDoc(userInput) as PassportData),
  });
}

export async function generateMockDSC(
  signatureType: string
): Promise<{ privateKeyPem: string; dsc: string }> {
  const response = await fetch(`${API_URL_STAGING}/generate-dsc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signatureType }),
  });
  if (!response.ok) {
    throw new Error(`Failed to generate DSC: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  if (!data || !data.data) {
    throw new Error('Missing data in server response');
  }
  if (typeof data.data.privateKeyPem !== 'string' || typeof data.data.dsc !== 'string') {
    throw new Error('Invalid DSC response format from server');
  }
  return { privateKeyPem: data.data.privateKeyPem, dsc: data.data.dsc };
}

function generateRandomName(): string {
  // Generate random letter combinations for first and last name
  const generateRandomLetters = (length: number): string => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return Array.from({ length }, () => letters[Math.floor(Math.random() * letters.length)]).join(
      ''
    );
  };

  const firstName = generateRandomLetters(4 + Math.floor(Math.random() * 4)); // 4-7 letters
  const lastName = generateRandomLetters(5 + Math.floor(Math.random() * 5)); // 5-9 letters

  return `${firstName} ${lastName}`;
}

function generateRandomBytes(length: number): number[] {
  // Generate numbers between -128 and 127 to match the existing signed byte format
  return Array.from({ length }, () => Math.floor(Math.random() * 256) - 128);
}

function generateDataGroupHashes(mrzHash: number[], hashLen: number): [number, number[]][] {
  // Generate hashes for DGs 2-15 (excluding some DGs that aren't typically used)
  const dataGroups: [number, number[]][] = [
    [1, mrzHash], // DG1 must be the MRZ hash
    [2, generateRandomBytes(hashLen)],
    [3, generateRandomBytes(hashLen)],
    [4, generateRandomBytes(hashLen)],
    [5, generateRandomBytes(hashLen)],
    [7, generateRandomBytes(hashLen)],
    [8, generateRandomBytes(hashLen)],
    // [11, generateRandomBytes(hashLen)],
    // [12, generateRandomBytes(hashLen)],
    // [14, generateRandomBytes(hashLen)],
    [15, generateRandomBytes(hashLen)],
  ];

  return dataGroups;
}
function sign(
  privateKeyPem: string,
  dsc: string,
  hashAlgorithm: string,
  eContent: number[]
): number[] {
  const { signatureAlgorithm, publicKeyDetails } = parseCertificateSimple(dsc);

  if (signatureAlgorithm === 'rsapss') {
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const md = forge.md[hashAlgorithm].create();
    md.update(forge.util.binary.raw.encode(new Uint8Array(eContent)));
    const pss = forge.pss.create({
      md: forge.md[hashAlgorithm].create(),
      mgf: forge.mgf.mgf1.create(forge.md[hashAlgorithm].create()),
      saltLength: parseInt((publicKeyDetails as PublicKeyDetailsRSAPSS).saltLength),
    });
    const signatureBytes = privateKey.sign(md, pss);
    return Array.from(signatureBytes, (c: string) => c.charCodeAt(0));
  } else if (signatureAlgorithm === 'ecdsa') {
    const curve = (publicKeyDetails as PublicKeyDetailsECDSA).curve;
    const curveForElliptic = getCurveForElliptic(curve);
    const ec = new elliptic.ec(curveForElliptic);

    const privateKeyDer = Buffer.from(
      privateKeyPem.replace(/-----BEGIN EC PRIVATE KEY-----|\n|-----END EC PRIVATE KEY-----/g, ''),
      'base64'
    );
    const asn1Data = asn1.fromBER(privateKeyDer);
    const privateKeyBuffer = (asn1Data.result.valueBlock as any).value[1].valueBlock.valueHexView;

    const keyPair = ec.keyFromPrivate(privateKeyBuffer);
    const msgHash = hash(hashAlgorithm, eContent, 'hex');

    const signature = keyPair.sign(msgHash, 'hex');
    // @ts-ignore-error toDer gives number[] what is fine for Buffer.from
    const signatureBytes = Array.from(Buffer.from(signature.toDER(), 'hex'));

    return signatureBytes;
  } else {
    const privKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const md = forge.md[hashAlgorithm].create();
    md.update(forge.util.binary.raw.encode(new Uint8Array(eContent)));
    const forgeSignature = privKey.sign(md);
    return Array.from(forgeSignature, (c: string) => c.charCodeAt(0));
  }
}
