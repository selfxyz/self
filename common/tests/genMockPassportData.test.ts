import { assert, expect } from 'chai';
import { describe, it } from 'mocha';
import { genMockPassportData } from '../src/utils/genMockPassportData';
import * as forge from 'node-forge';
import { PassportData, SignatureAlgorithm } from '../src/utils/types';
import * as asn1 from 'asn1js';
import { Certificate } from 'pkijs';
import elliptic from 'elliptic';
import { parseCertificateSimple } from '../src/utils/certificate_parsing/parseCertificateSimple';
import { getCurveForElliptic } from '../src/utils/certificate_parsing/curves';
import { PublicKeyDetailsECDSA, PublicKeyDetailsRSAPSS } from '../src/utils/certificate_parsing/dataStructure';
import { parsePassportData } from '../src/utils/parsePassportData';

const testCases = [
  { dgHashAlgo: 'sha1', eContentHashAlgo: 'sha1', sigAlg: 'rsa_sha1_65537_2048' },
  { dgHashAlgo: 'sha1', eContentHashAlgo: 'sha1', sigAlg: 'rsa_sha256_65537_2048' },
  { dgHashAlgo: 'sha256', eContentHashAlgo: 'sha256', sigAlg: 'rsapss_sha256_65537_2048' },
  { dgHashAlgo: 'sha256', eContentHashAlgo: 'sha256', sigAlg: 'ecdsa_sha256_secp256r1_256' },
  { dgHashAlgo: 'sha1', eContentHashAlgo: 'sha1', sigAlg: 'ecdsa_sha1_secp256r1_256' },
];

describe('Mock Passport Data Generator', function () {
  this.timeout(0);

  testCases.forEach(({ dgHashAlgo, eContentHashAlgo, sigAlg }) => {
    it(`should generate valid passport data for ${sigAlg}`, () => {
      const passportData = genMockPassportData(
        dgHashAlgo,
        eContentHashAlgo,
        sigAlg as SignatureAlgorithm,
        'FRA',
        '000101',
        '300101'
      );
      expect(passportData).to.exist;
      expect(verify(passportData, dgHashAlgo, eContentHashAlgo)).to.be.true;
    });
  });
});

function verify(passportData: PassportData, dgHashAlgo: string, eContentHashAlgo: string): boolean {
  const { dsc, eContent, signedAttr, encryptedDigest } = passportData;
  const { signatureAlgorithm, hashAlgorithm, publicKeyDetails } = parseCertificateSimple(dsc);
  console.error(
    '\x1b[32m',
    'signatureAlgorithm',
    signatureAlgorithm,
    ' hashAlgorithm',
    hashAlgorithm,
    'eContent size',
    eContent.length,
    'signedAttr size',
    signedAttr.length,
    '\x1b[0m'
  );
  const passportMetaData = parsePassportData(passportData);

  expect(passportMetaData.dg1HashFunction).to.equal(dgHashAlgo);
  expect(passportMetaData.eContentHashFunction).to.equal(eContentHashAlgo);

  if (signatureAlgorithm === 'ecdsa') {
    const certBuffer = Buffer.from(
      dsc.replace(/(-----(BEGIN|END) CERTIFICATE-----|\n)/g, ''),
      'base64'
    );
    const asn1Data = asn1.fromBER(certBuffer);
    const cert = new Certificate({ schema: asn1Data.result });
    const publicKeyInfo = cert.subjectPublicKeyInfo;
    const publicKeyBuffer = publicKeyInfo.subjectPublicKey.valueBlock.valueHexView;
    const curveForElliptic = getCurveForElliptic((publicKeyDetails as PublicKeyDetailsECDSA).curve);
    const ec = new elliptic.ec(curveForElliptic);

    const key = ec.keyFromPublic(publicKeyBuffer);
    const md = forge.md[hashAlgorithm].create();
    md.update(forge.util.binary.raw.encode(new Uint8Array(signedAttr)));
    const msgHash = md.digest().toHex();
    const signature_crypto = Buffer.from(encryptedDigest).toString('hex');

    return key.verify(msgHash, signature_crypto);
  } else {
    const cert = forge.pki.certificateFromPem(dsc);
    const publicKey = cert.publicKey as forge.pki.rsa.PublicKey;

    const md = forge.md[hashAlgorithm].create();
    md.update(forge.util.binary.raw.encode(new Uint8Array(signedAttr)));

    const signature = Buffer.from(encryptedDigest).toString('binary');

    if (signatureAlgorithm === 'rsapss') {
      const pss = forge.pss.create({
        md: forge.md[hashAlgorithm].create(),
        mgf: forge.mgf.mgf1.create(forge.md[hashAlgorithm].create()),
        saltLength: parseInt((publicKeyDetails as PublicKeyDetailsRSAPSS).saltLength),
      });
      return publicKey.verify(md.digest().bytes(), signature, pss);
    } else {
      return publicKey.verify(md.digest().bytes(), signature);
    }

  }
}

function getHashLen(hashAlgorithm: string): number {
  if (hashAlgorithm === 'sha1') {
    return 20;
  } else if (hashAlgorithm === 'sha256') {
    return 32;
  } else if (hashAlgorithm === 'sha384') {
    return 48;
  } else if (hashAlgorithm === 'sha512') {
    return 64;
  } else {
    throw new Error('Unsupported hash algorithm');
  }
}

