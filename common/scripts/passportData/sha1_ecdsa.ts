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
import * as forge from 'node-forge';
import { writeFileSync } from 'fs';
import elliptic from 'elliptic';
import * as crypto from 'crypto';

const sampleMRZ =
  'P<FRADUPONT<<ALPHONSE<HUGUES<ALBERT<<<<<<<<<24HB818324FRA0402111M3111115<<<<<<<<<<<<<<02';
const sampleDataHashes = [
  [
    2,
    [
      -66, 82, -76, -21, -34, 33, 79, 50, -104, -120, -114, 35, 116, -32, 6, -14, -100, -115, -128,
      -8, 10, 61, 98, 86, -8, 45, -49, -46, 90, -24, -81, 38,
    ],
  ],
  [
    3,
    [
      0, -62, 104, 108, -19, -10, 97, -26, 116, -58, 69, 110, 26, 87, 17, 89, 110, -57, 108, -6, 36,
      21, 39, 87, 110, 102, -6, -43, -82, -125, -85, -82,
    ],
  ],
  [
    11,
    [
      -120, -101, 87, -112, 111, 15, -104, 127, 85, 25, -102, 81, 20, 58, 51, 75, -63, 116, -22, 0,
      60, 30, 29, 30, -73, -115, 72, -9, -1, -53, 100, 124,
    ],
  ],
  [
    12,
    [
      41, -22, 106, 78, 31, 11, 114, -119, -19, 17, 92, 71, -122, 47, 62, 78, -67, -23, -55, -42,
      53, 4, 47, -67, -55, -123, 6, 121, 34, -125, 64, -114,
    ],
  ],
  [
    13,
    [
      91, -34, -46, -63, 62, -34, 104, 82, 36, 41, -118, -3, 70, 15, -108, -48, -100, 45, 105, -85,
      -15, -61, -71, 43, -39, -94, -110, -55, -34, 89, -18, 38,
    ],
  ],
  [
    14,
    [
      76, 123, -40, 13, 51, -29, 72, -11, 59, -63, -18, -90, 103, 49, 23, -92, -85, -68, -62, -59,
      -100, -69, -7, 28, -58, 95, 69, 15, -74, 56, 54, 38,
    ],
  ],
] as [number, number[]][];
const signatureAlgorithm = 'ecdsa-with-SHA1';
const hashLen = 20;

export function genMockPassportData_sha1WithECDSA(): PassportData {
  const mrzHash = hash(signatureAlgorithm, formatMrz(sampleMRZ));
  sampleDataHashes.unshift([1, mrzHash]);
  const concatenatedDataHashes = formatAndConcatenateDataHashes(
    [[1, mrzHash], ...sampleDataHashes],
    hashLen,
    33 // ? TODO replace with original dg1HashOffset
  );
  const eContent = assembleEContent(hash(signatureAlgorithm, concatenatedDataHashes));

  const ec = new elliptic.ec('p256');
  const keyPair = ec.genKeyPair();
  const pubKey = keyPair.getPublic();

  const md = forge.md.sha1.create();
  md.update(forge.util.binary.raw.encode(new Uint8Array(eContent)));
  const signature = keyPair.sign(md.digest().toHex(), 'hex');
  const signatureBytes = Array.from(Buffer.from(signature.toDER(), 'hex'));

  const Qx = pubKey.getX().toString(16);
  const Qy = pubKey.getY().toString(16);

  return {
    mrz: sampleMRZ,
    signatureAlgorithm: signatureAlgorithm,
    pubKey: {
      publicKeyQ: `(${Qx},${Qy},1,fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffff0000000000000000fffffffc)`,
    },
    dataGroupHashes: concatenatedDataHashes,
    eContent: eContent,
    encryptedDigest: signatureBytes,
    photoBase64: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABjElEQVR42mL8//8/AyUYiBQYmIw3...',
  };
}

function verify(passportData: PassportData): boolean {
  const { mrz, signatureAlgorithm, pubKey, dataGroupHashes, eContent, encryptedDigest } =
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

  const cleanPublicKeyQ = pubKey.publicKeyQ.replace(/[()]/g, '').split(',');
  const Qx = cleanPublicKeyQ[0];
  const Qy = cleanPublicKeyQ[1];

  const ec = new elliptic.ec('p256');
  const key = ec.keyFromPublic({ x: Qx, y: Qy }, 'hex');

  const messageBuffer = Buffer.from(eContent);
  const msgHash = crypto.createHash('sha1').update(messageBuffer).digest();

  const signature = Buffer.from(encryptedDigest).toString('hex');

  const isValid = key.verify(msgHash, signature);

  return isValid;
}

const mockPassportData = genMockPassportData_sha1WithECDSA();
console.log('Passport Data:', JSON.stringify(mockPassportData, null, 2));
console.log('Signature valid:', verify(mockPassportData));

writeFileSync(__dirname + '/passportData.json', JSON.stringify(mockPassportData, null, 2));
