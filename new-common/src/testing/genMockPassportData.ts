import * as asn1 from 'asn1js';
import elliptic from 'elliptic';
import forge from 'node-forge';

import { getCurveForElliptic } from '../certificates/parsing/curves.js';
import type {
  PublicKeyDetailsECDSA,
  PublicKeyDetailsRSAPSS,
} from '../foundation/types/certificate.js';
import { parseCertificateSimple } from '../certificates/parsing/parseCertificateSimple.js';
import { getHashLen, hash } from '../crypto/hash/sha.js';
import type { countryCodes } from '../foundation/constants/countries.js';
import type { PassportData, SignatureAlgorithm } from '../foundation/types/document.js';
import {
  formatAndConcatenateDataHashes,
  formatMrz,
  generateSignedAttr,
} from '../documents/passport/format.js';
import { getMockDSC } from './getMockDSC.js';
import { initPassportDataParsing } from '../documents/passport/parsing.js';

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

export function genAndInitMockPassportData(
  dgHashAlgo: string,
  eContentHashAlgo: string,
  signatureType: SignatureAlgorithm,
  nationality: keyof typeof countryCodes,
  birthDate: string,
  expiryDate: string,
  passportNumber: string = '15AA81234',
  lastName: string = 'DUPONT',
  firstName: string = 'ALPHONSE HUGHUES ALBERT',
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
      firstName,
    ),
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
  firstName: string = 'ALPHONSE HUGHUES ALBERT',
): PassportData {
  if (birthDate.length !== 6 || expiryDate.length !== 6) {
    throw new Error('birthdate and expiry date have to be in the "YYMMDD" format');
  }

  const lastNameParts = lastName
    .toUpperCase()
    .replace(/[^A-Z< ]/g, '')
    .split(' ');
  const formattedLastName = lastNameParts.join('<');

  const firstNameParts = firstName
    .toUpperCase()
    .replace(/[^A-Z< ]/g, '')
    .split(' ');
  const formattedFirstName = firstNameParts.join('<');

  let mrzLine1 = `P<${nationality}${formattedLastName}<<${formattedFirstName}`;
  mrzLine1 = mrzLine1.padEnd(44, '<');

  if (mrzLine1.length > 44) {
    throw new Error('First line of MRZ exceeds 44 characters');
  }

  const mrzLine2 = `${passportNumber}4${nationality}${birthDate}1M${expiryDate}5<<<<<<<<<<<<<<02`;
  const mrz = mrzLine1 + mrzLine2;

  if (mrz.length !== 88) {
    throw new Error(`MRZ must be 88 characters long, got ${mrz.length}`);
  }

  const { privateKeyPem, dsc } = getMockDSC(signatureType);

  const mrzHash = hash(dgHashAlgo, formatMrz(mrz));
  const dataGroupHashes = generateDataGroupHashes(mrzHash as number[], getHashLen(dgHashAlgo));
  const eContent = formatAndConcatenateDataHashes(dataGroupHashes, 63);
  const signedAttr = generateSignedAttr(hash(eContentHashAlgo, eContent) as number[]);
  const hashAlgo = signatureType.split('_')[1];
  const signature = sign(privateKeyPem, dsc, hashAlgo, signedAttr);
  const signatureBytes = Array.from(signature, byte => (byte < 128 ? byte : byte - 256));
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
  eContent: number[],
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
      'base64',
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
