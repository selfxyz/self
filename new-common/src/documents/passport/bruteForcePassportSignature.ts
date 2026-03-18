import * as asn1js from 'asn1js';
import forge from 'node-forge';
import { Certificate } from 'pkijs';

import { hashAlgos, saltLengths } from '../../foundation/constants/crypto.js';
import type { PublicKeyDetailsECDSA } from '../../foundation/types/certificate.js';
import type { PassportData } from '../../foundation/types/document.js';
import { forgeDigest, hash } from '../../crypto/hash/sha.js';
import { getCurveForElliptic } from '../../certificates/parsing/curves.js';
import { initElliptic } from '../../certificates/parsing/elliptic.js';
import { parseCertificateSimple } from '../../certificates/parsing/parseCertificateSimple.js';

export function bruteForceSignatureAlgorithm(passportData: PassportData) {
  const parsedDsc = parseCertificateSimple(passportData.dsc);
  if (parsedDsc.signatureAlgorithm === 'ecdsa') {
    const hashAlgorithm = bruteForceHashAlgorithm(passportData, 'ecdsa');
    return {
      signatureAlgorithm: 'ecdsa',
      hashAlgorithm: hashAlgorithm,
      saltLength: 0,
    };
  } else if (parsedDsc.signatureAlgorithm === 'rsa') {
    const hashAlgorithm = bruteForceHashAlgorithm(passportData, 'rsa');
    if (hashAlgorithm) {
      return {
        signatureAlgorithm: 'rsa',
        hashAlgorithm: hashAlgorithm,
        saltLength: 0,
      };
    }
  }
  // rsapss signature can use rsa key certificate — don't use else if
  for (const saltLength of saltLengths) {
    const hashAlgorithm = bruteForceHashAlgorithm(passportData, 'rsapss', saltLength);
    if (hashAlgorithm) {
      return {
        signatureAlgorithm: 'rsapss',
        hashAlgorithm: hashAlgorithm,
        saltLength: saltLength,
      };
    }
  }
  const hashAlgorithm = bruteForceHashAlgorithm(passportData, 'rsa');
  if (hashAlgorithm) {
    return {
      signatureAlgorithm: 'rsa',
      hashAlgorithm: hashAlgorithm,
      saltLength: 0,
    };
  }
}

function bruteForceHashAlgorithm(
  passportData: PassportData,
  signatureAlgorithm: string,
  saltLength?: number,
): string | false {
  for (const hashFunction of hashAlgos) {
    if (verifySignature(passportData, signatureAlgorithm, hashFunction, saltLength)) {
      return hashFunction;
    }
  }
  return false;
}

export function verifySignature(
  passportData: PassportData,
  signatureAlgorithm: string,
  hashAlgorithm: string,
  saltLength: number = 0,
): boolean {
  switch (signatureAlgorithm) {
    case 'ecdsa':
      return verifyECDSA(passportData, hashAlgorithm);
    case 'rsa':
      return verifyRSA(passportData, hashAlgorithm);
    case 'rsapss':
      return verifyRSAPSS(passportData, hashAlgorithm, saltLength);
  }
  return false;
}

function verifyECDSA(passportData: PassportData, hashAlgorithm: string): boolean {
  const elliptic = initElliptic();
  const { dsc, signedAttr, encryptedDigest } = passportData;
  const { publicKeyDetails } = parseCertificateSimple(dsc);
  const certBuffer = Buffer.from(
    dsc.replace(/(-----(BEGIN|END) CERTIFICATE-----|\n)/g, ''),
    'base64',
  );
  const asn1Data = asn1js.fromBER(certBuffer);
  const cert = new Certificate({ schema: asn1Data.result });
  const publicKeyInfo = cert.subjectPublicKeyInfo;
  const publicKeyBuffer = publicKeyInfo.subjectPublicKey.valueBlock.valueHexView;
  const curveForElliptic = getCurveForElliptic((publicKeyDetails as PublicKeyDetailsECDSA).curve);
  const ec = new elliptic.ec(curveForElliptic);

  const key = ec.keyFromPublic(publicKeyBuffer);
  const msgHash = hash(hashAlgorithm, signedAttr, 'hex');
  const signature_crypto = Buffer.from(encryptedDigest).toString('hex');

  return key.verify(msgHash, signature_crypto);
}

function verifyRSA(passportData: PassportData, hashAlgorithm: string): boolean {
  const { dsc, signedAttr, encryptedDigest } = passportData;
  const cert = forge.pki.certificateFromPem(dsc);
  const publicKey = cert.publicKey as forge.pki.rsa.PublicKey;
  const msgHash = hash(hashAlgorithm, signedAttr, 'binary');
  const signature = Buffer.from(encryptedDigest).toString('binary');
  try {
    return publicKey.verify(msgHash as string, signature);
  } catch {
    return false;
  }
}

function verifyRSAPSS(
  passportData: PassportData,
  hashAlgorithm: string,
  saltLength: number,
): boolean {
  const { dsc, signedAttr, encryptedDigest } = passportData;
  const cert = forge.pki.certificateFromPem(dsc);
  const publicKey = cert.publicKey as forge.pki.rsa.PublicKey;
  const msgHash = hash(hashAlgorithm, signedAttr, 'binary');
  const signature = Buffer.from(encryptedDigest).toString('binary');
  if (saltLength === 0) {
    throw new Error('Salt length is required for RSA-PSS');
  }
  try {
    const pss = forge.pss.create({
      md: forgeDigest(hashAlgorithm),
      mgf: forge.mgf.mgf1.create(forgeDigest(hashAlgorithm)),
      saltLength: saltLength,
    });
    return publicKey.verify(msgHash as string, signature, pss);
  } catch {
    return false;
  }
}
