import * as crypto from 'crypto';
import {
  arraysAreEqual,
  formatMrz,
  formatAndConcatenateDataHashes,
  bytesToBigDecimal,
} from '../../common/src/utils/utils';
import * as forge from 'node-forge';
import passportData from '../../common/inputs/passportData.json';
import {DataHash} from '../../common/src/utils/types';

// This script tests the whole flow from MRZ to signature
// The passportData is imported from passportData.json written by the server

const mrz = passportData.mrz;

console.log('mrz: ', mrz);

// Transforms the dataHashes object into an array of arrays
const dataHashes = passportData.dataGroupHashes as DataHash[];

const mrzHash = hash(formatMrz(mrz));

console.log('mrzHash:', mrzHash);
console.log(
  'mrzHash === dataHashes[0][1] ?',
  arraysAreEqual(mrzHash, dataHashes[0][1] as number[]),
);

const concatenatedDataHashes = formatAndConcatenateDataHashes(
  mrzHash,
  dataHashes,
);

const concatenatedDataHashesHashDigest = hash(concatenatedDataHashes);

// check that concatenatedDataHashesHashDigest is at the right place of passportData.eContent
const sliceOfEContent = passportData.eContent.slice(72, 72 + 32);

console.log(
  'Are they equal ?',
  arraysAreEqual(sliceOfEContent, concatenatedDataHashesHashDigest),
);

// now let's verify the signature
// const {modulus, exponent} = parsePubKeyString(passportData.publicKey);
// Create the public key
const rsa = forge.pki.rsa;
const publicKey = rsa.setPublicKey(
  new forge.jsbn.BigInteger(passportData.pubKey.modulus, 10),
  new forge.jsbn.BigInteger("10001", 16),
);

// SHA-256 hash of the eContent
const md = forge.md.sha256.create();
md.update(forge.util.binary.raw.encode(new Uint8Array(passportData.eContent)));
const hashOfEContent = md.digest().getBytes();

console.log('modulus', passportData.pubKey.modulus);
console.log('eContent', bytesToBigDecimal(passportData.eContent));
console.log('signature', bytesToBigDecimal(passportData.encryptedDigest));

// Signature verification
const signatureBytes = Buffer.from(passportData.encryptedDigest).toString(
  'binary',
);
const valid = publicKey.verify(hashOfEContent, signatureBytes);

if (valid) {
  console.log('The signature is valid.');
} else {
  console.log('The signature is not valid.');
}

function hash(bytesArray: number[]): number[] {
  const hash = crypto.createHash('sha256');
  hash.update(Buffer.from(bytesArray));
  return Array.from(hash.digest()).map(x => (x < 128 ? x : x - 256));
}