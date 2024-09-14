import { assert, expect } from 'chai';
import { describe, it } from 'mocha';
import { genMockPassportData } from '../src/utils/genMockPassportData';
import * as forge from 'node-forge';
import { PassportData, SignatureAlgorithm } from '../src/utils/types';
import { formatMrz, hash, arraysAreEqual, findSubarrayIndex } from '../src/utils/utils';
import { parseCertificate } from '../src/utils/certificates/handleCertificate';
import * as asn1 from 'asn1js';
import { Certificate } from 'pkijs';
import elliptic from 'elliptic';

const sigAlgs: SignatureAlgorithm[] = [
  'rsa_sha1',
  'rsa_sha256',
  'rsapss_sha256',
  'ecdsa_sha256',
  'ecdsa_sha1',
  'ecdsa_sha384',
];

describe('Mock Passport Data Generator', function () {
  this.timeout(0);

  sigAlgs.forEach(sigAlg => {
    it(`should generate valid passport data for ${sigAlg}`, () => {
      const passportData = genMockPassportData(sigAlg, 'FRA', '000101', '300101');
      expect(passportData).to.exist;
      expect(verify(passportData)).to.be.true;
    });
  });
});

function verify(passportData: PassportData): boolean {
  const { mrz, dsc, dataGroupHashes, eContent, encryptedDigest } = passportData;
  const { signatureAlgorithm, hashFunction, hashLen, curve } = parseCertificate(dsc);
  const formattedMrz = formatMrz(mrz);
  const mrzHash = hash(hashFunction, formattedMrz);
  const dg1HashOffset = findSubarrayIndex(dataGroupHashes, mrzHash)
  assert(dg1HashOffset !== -1, 'MRZ hash index not found in dataGroupHashes');

  const concatHash = hash(hashFunction, dataGroupHashes)
  assert(
    arraysAreEqual(
      concatHash,
      eContent.slice(eContent.length - hashLen)
    ),
    'concatHash is not at the right place in eContent'
  );

  if (signatureAlgorithm === 'ecdsa') {
    const certBuffer = Buffer.from(dsc.replace(/(-----(BEGIN|END) CERTIFICATE-----|\n)/g, ''), 'base64');
    const asn1Data = asn1.fromBER(certBuffer);
    const cert = new Certificate({ schema: asn1Data.result });
    const publicKeyInfo = cert.subjectPublicKeyInfo;
    const publicKeyBuffer = publicKeyInfo.subjectPublicKey.valueBlock.valueHexView;
    const curveForElliptic = curve === 'secp256r1' ? 'p256' : 'p384';
    const ec = new elliptic.ec(curveForElliptic);

    const key = ec.keyFromPublic(publicKeyBuffer);
    const md = hashFunction === 'sha1' ? forge.md.sha1.create() : forge.md.sha256.create();
    md.update(forge.util.binary.raw.encode(new Uint8Array(eContent)));
    const msgHash = md.digest().toHex()
    const signature_crypto = Buffer.from(encryptedDigest).toString('hex');

    return key.verify(msgHash, signature_crypto);
  } else {
    const cert = forge.pki.certificateFromPem(dsc);
    const publicKey = cert.publicKey as forge.pki.rsa.PublicKey;

    const md = forge.md[hashFunction].create();
    md.update(forge.util.binary.raw.encode(new Uint8Array(eContent)));

    const signature = Buffer.from(encryptedDigest).toString('binary');

    if (signatureAlgorithm === 'rsapss') {
      const pss = forge.pss.create({
        md: forge.md[hashFunction].create(),
        mgf: forge.mgf.mgf1.create(forge.md[hashFunction].create()),
        saltLength: hashLen
      });
      return publicKey.verify(md.digest().bytes(), signature, pss);
    } else {
      return publicKey.verify(md.digest().bytes(), signature);
    }
  }
}
