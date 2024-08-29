import assert from 'assert';
import { PassportData } from '../../../common/src/utils/types';
import {
  hash,
  assembleEContent,
  formatAndConcatenateDataHashes,
  formatMrz,
  arraysAreEqual,
  findSubarrayIndex,
} from '../../../common/src/utils/utils';
import * as asn1 from 'asn1js';
import { Certificate } from 'pkijs';
import { writeFileSync } from 'fs';
import elliptic from 'elliptic';
import { sampleDataHashes_large } from '../../src/constants/sampleDataHashes';
import { mock_dsc_key_sha256_ecdsa, mock_dsc_sha256_ecdsa } from "../../src/constants/mockCertificates";

const sampleMRZ =
  'P<FRADUPONT<<ALPHONSE<HUGUES<ALBERT<<<<<<<<<24HB818324FRA0402111M3111115<<<<<<<<<<<<<<02';
const signatureAlgorithm = 'ecdsa-with-SHA256';
const hashLen = 32;
const ec = new elliptic.ec('p256');

export function genMockPassportData_sha256WithECDSA(): PassportData {
  const mrzHash = hash(signatureAlgorithm, formatMrz(sampleMRZ));
  sampleDataHashes_large.unshift([1, mrzHash]);
  const concatenatedDataHashes = formatAndConcatenateDataHashes(
    [[1, mrzHash], ...sampleDataHashes_large],
    hashLen,
    33
  );
  const eContent = assembleEContent(hash(signatureAlgorithm, concatenatedDataHashes));

  const privateKeyDer = Buffer.from(mock_dsc_key_sha256_ecdsa.replace(/-----BEGIN EC PRIVATE KEY-----|\n|-----END EC PRIVATE KEY-----/g, ''), 'base64');
  const asn1Data = asn1.fromBER(privateKeyDer);
  const privateKeyBuffer = (asn1Data.result.valueBlock as any).value[1].valueBlock.valueHexView;

  const keyPair = ec.keyFromPrivate(privateKeyBuffer);

  const eContentHash = hash(signatureAlgorithm, eContent);
  const signature = keyPair.sign(eContentHash);
  const signatureBytes = signature.toDER();

  return {
    mrz: sampleMRZ,
    signatureAlgorithm: signatureAlgorithm,
    dsc: mock_dsc_sha256_ecdsa,
    dataGroupHashes: concatenatedDataHashes,
    eContent: eContent,
    encryptedDigest: signatureBytes,
    photoBase64: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABjElEQVR42mL8//8/AyUYiBQYmIw3...',
  };
}

function verify(passportData: PassportData): boolean {
  const { mrz, signatureAlgorithm, dsc, dataGroupHashes, eContent, encryptedDigest } =
    passportData;
  const formattedMrz = formatMrz(mrz);
  const mrzHash = hash(signatureAlgorithm, formattedMrz);
  const dg1HashOffset = findSubarrayIndex(dataGroupHashes, mrzHash);
  console.log('dg1HashOffset', dg1HashOffset);
  assert(dg1HashOffset !== -1, 'MRZ hash index not found in dataGroupHashes');

  const concatHash = hash(signatureAlgorithm, dataGroupHashes);
  assert(
    arraysAreEqual(concatHash, eContent.slice(eContent.length - concatHash.length)),
    'concatHash is not at the right place in eContent'
  );

  const certBuffer = Buffer.from(dsc.replace(/(-----(BEGIN|END) CERTIFICATE-----|\n)/g, ''), 'base64');
  const asn1Data = asn1.fromBER(certBuffer);
  const cert = new Certificate({ schema: asn1Data.result });
  const publicKeyInfo = cert.subjectPublicKeyInfo;
  const publicKeyBuffer = publicKeyInfo.subjectPublicKey.valueBlock.valueHexView;

  const key = ec.keyFromPublic(publicKeyBuffer);

  const eContentHash = hash(signatureAlgorithm, eContent);
  const signature = Buffer.from(encryptedDigest).toString('hex');

  return key.verify(eContentHash, signature);
}

const mockPassportData = genMockPassportData_sha256WithECDSA();
console.log('Passport Data:', JSON.stringify(mockPassportData, null, 2));
console.log('Signature valid:', verify(mockPassportData));

writeFileSync(__dirname + '/passportData.json', JSON.stringify(mockPassportData, null, 2));
