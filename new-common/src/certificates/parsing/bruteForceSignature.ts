import * as asn1js from 'asn1js';
import forge from 'node-forge';
import { Certificate } from 'pkijs';

import { hashAlgos, saltLengths } from '../../foundation/constants/crypto.js';
import type { CertificateData, PublicKeyDetailsECDSA } from '../../foundation/types/certificate.js';
import { forgeDigest, hash } from '../../crypto/hash/sha.js';
import { getCurveForElliptic } from './curves.js';
import { initElliptic } from './elliptic.js';

export function bruteForceSignatureAlgorithmDsc(dsc: CertificateData, csca: CertificateData) {
  if (csca.signatureAlgorithm === 'ecdsa') {
    const hashAlgorithm = bruteForceHashAlgorithmDsc(dsc, csca, 'ecdsa');
    return {
      signatureAlgorithm: 'ecdsa',
      hashAlgorithm: hashAlgorithm,
      saltLength: 0,
    };
  } else if (csca.signatureAlgorithm === 'rsa') {
    const hashAlgorithm = bruteForceHashAlgorithmDsc(dsc, csca, 'rsa');
    if (hashAlgorithm) {
      return {
        signatureAlgorithm: 'rsa',
        hashAlgorithm: hashAlgorithm,
        saltLength: 0,
      };
    }
  }
  for (const saltLength of saltLengths) {
    const hashAlgorithm = bruteForceHashAlgorithmDsc(dsc, csca, 'rsapss', saltLength);
    if (hashAlgorithm) {
      return {
        signatureAlgorithm: 'rsapss',
        hashAlgorithm: hashAlgorithm,
        saltLength: saltLength,
      };
    }
  }
}

function bruteForceHashAlgorithmDsc(
  dsc: CertificateData,
  csca: CertificateData,
  signatureAlgorithm: string,
  saltLength?: number
): any {
  for (const hashFunction of hashAlgos) {
    if (verifySignature(dsc, csca, signatureAlgorithm, hashFunction, saltLength)) {
      return hashFunction;
    }
  }
  return false;
}

function verifySignature(
  dsc: CertificateData,
  csca: CertificateData,
  signatureAlgorithm: string,
  hashAlgorithm: string,
  saltLength: number = 0
): boolean {
  switch (signatureAlgorithm) {
    case 'ecdsa':
      return verifyECDSA(dsc, csca, hashAlgorithm);
    case 'rsa':
      return verifyRSA(dsc, csca, hashAlgorithm);
    case 'rsapss':
      return verifyRSAPSS(dsc, csca, hashAlgorithm, saltLength);
  }
  return false;
}

function verifyECDSA(dsc: CertificateData, csca: CertificateData, hashAlgorithm: string): boolean {
  const elliptic = initElliptic();
  const certBuffer_csca = Buffer.from(
    csca.rawPem.replace(/(-----(BEGIN|END) CERTIFICATE-----|\n)/g, ''),
    'base64'
  );
  const asn1Data_csca = asn1js.fromBER(certBuffer_csca);
  const cert_csca = new Certificate({ schema: asn1Data_csca.result });
  const publicKeyInfo_csca = cert_csca.subjectPublicKeyInfo;
  const publicKeyBuffer_csca = publicKeyInfo_csca.subjectPublicKey.valueBlock.valueHexView;
  const curveForElliptic_csca = getCurveForElliptic(
    (csca.publicKeyDetails as PublicKeyDetailsECDSA).curve
  );
  const ec_csca = new elliptic.ec(curveForElliptic_csca);
  const key_csca = ec_csca.keyFromPublic(publicKeyBuffer_csca);

  const tbsHash = getTBSHash(dsc.rawPem, hashAlgorithm, 'hex');

  const certBuffer_dsc = Buffer.from(
    dsc.rawPem.replace(/(-----(BEGIN|END) CERTIFICATE-----|\n)/g, ''),
    'base64'
  );
  const asn1Data_dsc = asn1js.fromBER(certBuffer_dsc);
  const cert_dsc = new Certificate({ schema: asn1Data_dsc.result });
  const signatureValue = cert_dsc.signatureValue.valueBlock.valueHexView;
  const signature_crypto = Buffer.from(signatureValue).toString('hex');
  return key_csca.verify(tbsHash, signature_crypto);
}

function verifyRSA(dsc: CertificateData, csca: CertificateData, hashAlgorithm: string): boolean {
  try {
    const cscaCert = forge.pki.certificateFromPem(csca.rawPem);
    const tbsHash = getTBSHash(dsc.rawPem, hashAlgorithm);
    if (!tbsHash) {
      return false;
    }
    const publicKey = cscaCert.publicKey as forge.pki.rsa.PublicKey;
    const certBuffer_dsc = Buffer.from(
      dsc.rawPem.replace(/(-----(BEGIN|END) CERTIFICATE-----|\n)/g, ''),
      'base64'
    );
    const asn1Data_dsc = asn1js.fromBER(certBuffer_dsc);
    const cert_dsc = new Certificate({ schema: asn1Data_dsc.result });
    const signatureValue = cert_dsc.signatureValue.valueBlock.valueHexView;
    const signature = Buffer.from(signatureValue).toString('binary');
    try {
      const verified = publicKey.verify(tbsHash, signature);
      return verified;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

function verifyRSAPSS(
  dsc: CertificateData,
  csca: CertificateData,
  hashAlgorithm: string,
  saltLength: number
): boolean {
  try {
    const dscCert = forge.pki.certificateFromPem(dsc.rawPem);
    const cscaCert = forge.pki.certificateFromPem(csca.rawPem);
    const tbsHash = getTBSHash(dsc.rawPem, hashAlgorithm);
    if (!tbsHash) {
      return false;
    }

    const publicKey = cscaCert.publicKey as forge.pki.rsa.PublicKey;
    const signature = dscCert.signature;

    if (saltLength === 0) {
      throw new Error('Salt length is required for RSA-PSS');
    }

    try {
      const pss = forge.pss.create({
        md: forgeDigest(hashAlgorithm),
        mgf: forge.mgf.mgf1.create(forgeDigest(hashAlgorithm)),
        saltLength: saltLength,
      });
      return publicKey.verify(tbsHash, signature, pss);
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

export function getTBSHash(
  pem: string,
  hashFunction: string,
  format: 'hex' | 'data' = 'data'
): string {
  const certBuffer = Buffer.from(
    pem.replace(/(-----(BEGIN|END) CERTIFICATE-----|\n)/g, ''),
    'base64'
  );
  const asn1Data_cert = asn1js.fromBER(certBuffer);
  const cert = new Certificate({ schema: asn1Data_cert.result });
  const tbsAsn1 = cert.encodeTBS();
  const tbsDer = tbsAsn1.toBER(false);
  const tbsBytes = Buffer.from(tbsDer);
  const tbsBytesArray = Array.from(tbsBytes);
  const msgHash = hash(hashFunction, tbsBytesArray, format === 'hex' ? 'hex' : 'binary');
  return msgHash as string;
}
