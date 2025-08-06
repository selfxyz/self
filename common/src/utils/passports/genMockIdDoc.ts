// generate a mock id document

import * as asn1 from 'asn1js';
import elliptic from 'elliptic';
import forge from 'node-forge';

import type { hashAlgosTypes } from '../../constants/constants.js';
import { API_URL_STAGING } from '../../constants/constants.js';
import { countries } from '../../constants/countries.js';
import { getCurveForElliptic } from '../certificate_parsing/curves.js';
import type {
  PublicKeyDetailsECDSA,
  PublicKeyDetailsRSAPSS,
} from '../certificate_parsing/dataStructure.js';
import { parseCertificateSimple } from '../certificate_parsing/parseCertificateSimple.js';
import { getHashLen, hash } from '../hash.js';
import type { DocumentType, PassportData, SignatureAlgorithm } from '../types.js';
import { genDG1 } from './dg1.js';
import { formatAndConcatenateDataHashes, formatMrz, generateSignedAttr } from './format.js';
import { getMockDSC } from './getMockDSC.js';
import { initPassportDataParsing } from './passport.js';

export interface IdDocInput {
  idType: 'mock_passport' | 'mock_id_card';
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
  lastName: 'DOE',
  firstName: 'JOHN',
  sex: 'M',
};

export function genMockIdDoc(
  userInput: Partial<IdDocInput> = {},
  mockDSC?: { dsc: string; privateKeyPem: string }
): PassportData {
  const mergedInput: IdDocInput = {
    ...defaultIdDocInput,
    ...userInput,
  };
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
    ...genMockIdDoc(userInput),
  });
}

export async function generateMockDSC(
  signatureType: string
): Promise<{ privateKeyPem: string; dsc: string }> {
  const response = await fetch(`${API_URL_STAGING}/api/v2/generate-dsc`, {
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
