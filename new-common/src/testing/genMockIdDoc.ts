import * as asn1 from 'asn1js';
import elliptic from 'elliptic';
import forge from 'node-forge';

import type { hashAlgosTypes } from '../foundation/constants/crypto.js';
import { API_URL_STAGING } from '../foundation/constants/network.js';
import { countries } from '../data/countries.js';
import { getCurveForElliptic } from '../certificates/parsing/curves.js';
import type {
  PublicKeyDetailsECDSA,
  PublicKeyDetailsRSAPSS,
} from '../foundation/types/certificate.js';
import { parseCertificateSimple } from '../certificates/parsing/parseCertificateSimple.js';
import { getHashLen, hash } from '../crypto/hash/sha.js';
import type {
  AadhaarData,
  DocumentType,
  PassportData,
  SignatureAlgorithm,
} from '../foundation/types/document.js';
import { genDG1 } from './dg1.js';
import {
  formatAndConcatenateDataHashes,
  formatMrz,
  generateSignedAttr,
} from '../documents/passport/format.js';
import { getMockDSC } from './getMockDSC.js';
import { initPassportDataParsing } from '../documents/passport/parsing.js';
import { processQRData, extractSignatureBytes } from '../documents/aadhaar/qr.js';
import { AADHAAR_MOCK_PRIVATE_KEY_PEM, AADHAAR_MOCK_PUBLIC_KEY_PEM } from './mockAadhaarCert.js';
import { generateTestData, testCustomData } from './genMockAadhaarData.js';

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
  pincode?: string;
  state?: string;
}

type IdDocReturnMap = {
  [K in IdDocInput['idType']]: K extends 'mock_aadhaar' ? AadhaarData : PassportData;
};

type IdDocResult<T extends IdDocInput['idType']> = IdDocReturnMap[T];

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
  pincode: '110051',
  state: 'Delhi',
};

function genMockAadhaarDoc(userInput: Partial<IdDocInput>): AadhaarData {
  // Only pass fields the caller explicitly set — passport-format defaults
  // (e.g. '900101' YYMMDD) would corrupt aadhaar's DD-MM-YYYY layout via
  // replaceBytesBetween, which changes array length and shifts delimiters.
  const generated = generateTestData({
    privKeyPem: AADHAAR_MOCK_PRIVATE_KEY_PEM,
    data: testCustomData,
    name: userInput.firstName,
    dob: userInput.birthDate,
    gender: userInput.sex,
    pincode: userInput.pincode,
    state: userInput.state,
  });
  const qrData = generated.testQRData;

  const processed = processQRData(qrData);
  const signatureBytes = extractSignatureBytes(processed.decodedData);

  return {
    documentType: 'mock_aadhaar',
    documentCategory: 'aadhaar',
    mock: true,
    qrData,
    extractedFields: processed.extractedFields,
    signature: Array.from(signatureBytes),
    publicKey: AADHAAR_MOCK_PUBLIC_KEY_PEM,
    photoHash: processed.photoHash.toString(),
  };
}

export function genMockIdDoc<T extends IdDocInput['idType']>(
  userInput: Partial<IdDocInput> & { idType: T },
  mockDSC?: { dsc: string; privateKeyPem: string },
): IdDocResult<T> {
  if (userInput.idType === 'mock_aadhaar') {
    return genMockAadhaarDoc(userInput) as IdDocResult<T>;
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
    getHashLen(mergedInput.dgHashAlgo),
  );
  const eContent = formatAndConcatenateDataHashes(dataGroupHashes, 63);
  const eContentHash = hash(mergedInput.eContentHashAlgo, eContent);
  const signedAttr = generateSignedAttr(eContentHash as number[]);
  const hashAlgo = mergedInput.signatureType.split('_')[1];
  const signature = sign(privateKeyPem, dsc, hashAlgo, signedAttr);
  const signatureBytes = Array.from(signature, byte => (byte < 128 ? byte : byte - 256));
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
  } as IdDocResult<T & IdDocInput>;
}

export function genMockIdDocAndInitDataParsing(
  userInput: Partial<IdDocInput> & { idType: 'mock_passport' | 'mock_id_card' },
) {
  return initPassportDataParsing({
    ...genMockIdDoc(userInput),
  });
}

export async function generateMockDSC(
  signatureType: string,
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

function generateRandomBytes(length: number): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * 256) - 128);
}

function generateDataGroupHashes(mrzHash: number[], hashLen: number): [number, number[]][] {
  const dataGroups: [number, number[]][] = [
    [1, mrzHash],
    [2, generateRandomBytes(hashLen)],
    [3, generateRandomBytes(hashLen)],
    [4, generateRandomBytes(hashLen)],
    [5, generateRandomBytes(hashLen)],
    [7, generateRandomBytes(hashLen)],
    [8, generateRandomBytes(hashLen)],
    [15, generateRandomBytes(hashLen)],
  ];

  return dataGroups;
}

function sign(
  privateKeyPem: string,
  dsc: string,
  hashAlgorithm: string,
  eContent: number[],
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
      'base64',
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
