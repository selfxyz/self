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
import { sampleDataHashes_large } from '../../src/constants/sampleDataHashes';

const sampleMRZ =
  'P<FRADUPONT<<ALPHONSE<HUGUES<ALBERT<<<<<<<<<24HB818324FRA0402111M3111115<<<<<<<<<<<<<<02';
const signatureAlgorithm = 'ecdsa-with-SHA256';
const hashLen = 32;

export function genMockPassportData_sha256WithECDSA(): PassportData {
  const mrzHash = hash(signatureAlgorithm, formatMrz(sampleMRZ));
  sampleDataHashes_large.unshift([1, mrzHash]);
  const concatenatedDataHashes = formatAndConcatenateDataHashes(
    [[1, mrzHash], ...sampleDataHashes_large],
    hashLen,
    33
  );
  const eContent = assembleEContent(hash(signatureAlgorithm, concatenatedDataHashes));

  const ec = new elliptic.ec('p256');
  const keyPair = ec.genKeyPair();
  const pubKey = keyPair.getPublic();

  const md = forge.md.sha256.create();
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
  const msgHash = crypto.createHash('sha256').update(messageBuffer).digest();

  const signature = Buffer.from(encryptedDigest).toString('hex');

  const isValid = key.verify(msgHash, signature);

  return isValid;
}

const mockPassportData = genMockPassportData_sha256WithECDSA();
console.log('Passport Data:', JSON.stringify(mockPassportData, null, 2));
console.log('Signature valid:', verify(mockPassportData));

writeFileSync(__dirname + '/passportData.json', JSON.stringify(mockPassportData, null, 2));
