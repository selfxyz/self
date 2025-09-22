import * as asn1 from 'asn1js';
import elliptic from 'elliptic';
import forge from 'node-forge';

import type { countryCodes } from '../../constants/constants.js';
import { getCurveForElliptic } from '../certificate_parsing/curves.js';
import type {
  PublicKeyDetailsECDSA,
  PublicKeyDetailsRSAPSS,
} from '../certificate_parsing/dataStructure.js';
import { parseCertificateSimple } from '../certificate_parsing/parseCertificateSimple.js';
import { getHashLen, hash } from '../hash.js';
import type { PassportData, SignatureAlgorithm } from '../types.js';
import { formatAndConcatenateDataHashes, formatMrz, generateSignedAttr } from './format.js';
import { getMockDSC } from './getMockDSC.js';
import { initPassportDataParsing } from './passport.js';

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

export function genAndInitMockPassportData(
  dgHashAlgo: string,
  eContentHashAlgo: string,
  signatureType: SignatureAlgorithm,
  nationality: keyof typeof countryCodes,
  birthDate: string,
  expiryDate: string,
  passportNumber: string = '15AA81234',
  lastName: string = 'DUPONT',
  firstName: string = 'ALPHONSE HUGHUES ALBERT'
): PassportData {
  return initPassportDataParsing(
    genMockPassportData(
      dgHashAlgo,
      eContentHashAlgo,
      signatureType,
      nationality,
      birthDate,
      expiryDate,
      passportNumber,
      lastName,
      firstName
    )
  );
}

export function genMockPassportData(
  dgHashAlgo: string,
  eContentHashAlgo: string,
  signatureType: SignatureAlgorithm,
  nationality: keyof typeof countryCodes,
  birthDate: string,
  expiryDate: string,
  passportNumber: string = '15AA81234',
  lastName: string = 'DUPONT',
  firstName: string = 'ALPHONSE HUGHUES ALBERT'
): PassportData {
  if (birthDate.length !== 6 || expiryDate.length !== 6) {
    throw new Error('birthdate and expiry date have to be in the "YYMMDD" format');
  }

  // Prepare last name: Convert to uppercase, remove invalid characters, split by spaces, and join with '<'
  const lastNameParts = lastName
    .toUpperCase()
    .replace(/[^A-Z< ]/g, '')
    .split(' ');
  const formattedLastName = lastNameParts.join('<');

  // Prepare first name: Convert to uppercase, remove invalid characters, split by spaces, and join with '<'
  const firstNameParts = firstName
    .toUpperCase()
    .replace(/[^A-Z< ]/g, '')
    .split(' ');
  const formattedFirstName = firstNameParts.join('<');

  // Build the first line of MRZ
  let mrzLine1 = `P<${nationality}${formattedLastName}<<${formattedFirstName}`;

  // Pad the first line with '<' to make it exactly 44 characters
  mrzLine1 = mrzLine1.padEnd(44, '<');

  if (mrzLine1.length > 44) {
    throw new Error('First line of MRZ exceeds 44 characters');
  }

  // Build the second line of MRZ
  const mrzLine2 = `${passportNumber}4${nationality}${birthDate}1M${expiryDate}5<<<<<<<<<<<<<<02`;

  // Combine both lines to form the MRZ
  const mrz = mrzLine1 + mrzLine2;

  // Validate the MRZ length
  if (mrz.length !== 88) {
    throw new Error(`MRZ must be 88 characters long, got ${mrz.length}`);
  }

  const { privateKeyPem, dsc } = getMockDSC(signatureType);

  // Generate MRZ hash first
  const mrzHash = hash(dgHashAlgo, formatMrz(mrz));

  // Generate random hashes for other DGs, passing mrzHash for DG1
  const dataGroupHashes = generateDataGroupHashes(mrzHash as number[], getHashLen(dgHashAlgo));

  const eContent = formatAndConcatenateDataHashes(dataGroupHashes, 63);
  const signedAttr = generateSignedAttr(hash(eContentHashAlgo, eContent) as number[]);
  const hashAlgo = signatureType.split('_')[1];
  const signature = sign(privateKeyPem, dsc, hashAlgo, signedAttr);
  const signatureBytes = Array.from(signature, (byte) => (byte < 128 ? byte : byte - 256));
  return {
    dsc: dsc,
    mrz: mrz,
    dg2Hash: dataGroupHashes.find(([dgNum]) => dgNum === 2)?.[1] || [],
    eContent: eContent,
    signedAttr: signedAttr,
    encryptedDigest: signatureBytes,
    documentType: 'mock_passport',
    documentCategory: 'passport',
    mock: true,
  };
}
function sign(
  privateKeyPem: string,
  dsc: string,
  hashAlgorithm: string,
  eContent: number[]
): number[] {
  const actualForge = forge.pki ? forge : (forge as any).default;
  const { signatureAlgorithm, publicKeyDetails } = parseCertificateSimple(dsc);

  if (signatureAlgorithm === 'rsapss') {
    const privateKey = actualForge.pki.privateKeyFromPem(privateKeyPem);
    const md = actualForge.md[hashAlgorithm].create();
    md.update(actualForge.util.binary.raw.encode(new Uint8Array(eContent)));
    const pss = actualForge.pss.create({
      md: actualForge.md[hashAlgorithm].create(),
      mgf: actualForge.mgf.mgf1.create(actualForge.md[hashAlgorithm].create()),
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
    // @ts-ignore-error this seems wrong
    const signatureBytes = Array.from(Buffer.from(signature.toDER(), 'hex'));

    return signatureBytes;
  } else {
    const privKey = actualForge.pki.privateKeyFromPem(privateKeyPem);
    const md = actualForge.md[hashAlgorithm].create();
    md.update(actualForge.util.binary.raw.encode(new Uint8Array(eContent)));
    const forgeSignature = privKey.sign(md);
    return Array.from(forgeSignature, (c: string) => c.charCodeAt(0));
  }
}
