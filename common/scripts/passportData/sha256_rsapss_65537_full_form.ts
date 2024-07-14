// this file shows the fully explicit form of RSASSA-PSS, based on https://github.com/shigeki/ohtsu_rsa_pss_js/.
// It can be useful to implement the circuit
// It is currently broken so the line that errors is commented

import assert from "assert";
import { PassportData } from "../../src/utils/types";
import { hash, assembleEContent, formatAndConcatenateDataHashes, formatMrz, arraysAreEqual, findSubarrayIndex } from "../../src/utils/utils";
import * as forge from 'node-forge';
import crypto from 'crypto';
import { writeFileSync } from "fs";

const sampleMRZ = "P<FRADUPONT<<ALPHONSE<HUGUES<ALBERT<<<<<<<<<24HB818324FRA0402111M3111115<<<<<<<<<<<<<<02"
const sampleDataHashes = [
  [
    2,
    [-66, 82, -76, -21, -34, 33, 79, 50, -104, -120, -114, 35, 116, -32, 6, -14, -100, -115, -128, -8, 10, 61, 98, 86, -8, 45, -49, -46, 90, -24, -81, 38]
  ],
  [
    3,
    [0, -62, 104, 108, -19, -10, 97, -26, 116, -58, 69, 110, 26, 87, 17, 89, 110, -57, 108, -6, 36, 21, 39, 87, 110, 102, -6, -43, -82, -125, -85, -82]
  ],
  [
    11,
    [-120, -101, 87, -112, 111, 15, -104, 127, 85, 25, -102, 81, 20, 58, 51, 75, -63, 116, -22, 0, 60, 30, 29, 30, -73, -115, 72, -9, -1, -53, 100, 124]
  ],
  [
    12,
    [41, -22, 106, 78, 31, 11, 114, -119, -19, 17, 92, 71, -122, 47, 62, 78, -67, -23, -55, -42, 53, 4, 47, -67, -55, -123, 6, 121, 34, -125, 64, -114]
  ],
  [
    13,
    [91, -34, -46, -63, 62, -34, 104, 82, 36, 41, -118, -3, 70, 15, -108, -48, -100, 45, 105, -85, -15, -61, -71, 43, -39, -94, -110, -55, -34, 89, -18, 38]
  ],
  [
    14,
    [76, 123, -40, 13, 51, -29, 72, -11, 59, -63, -18, -90, 103, 49, 23, -92, -85, -68, -62, -59, -100, -69, -7, 28, -58, 95, 69, 15, -74, 56, 54, 38]
  ]
] as [number, number[]][]
const signatureAlgorithm = 'sha256WithRSASSAPSS'
const hashLen = 32

export function genMockPassportData_sha256WithRSASSAPSS_65537(): PassportData {
  const keypair = forge.pki.rsa.generateKeyPair(2048);
  const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);

  const publicKey = keypair.publicKey;
  const modulus = publicKey.n.toString(10);
  const exponent = publicKey.e.toString(10);
  const salt = Buffer.from('dee959c7e06411361420ff80185ed57f3e6776afdee959c7e064113614201420', 'hex');

  const mrzHash = hash(signatureAlgorithm, formatMrz(sampleMRZ));
  const concatenatedDataHashes = formatAndConcatenateDataHashes(
    [[1, mrzHash], ...sampleDataHashes],
    hashLen,
    30
  );

  const eContent = assembleEContent(hash(signatureAlgorithm, concatenatedDataHashes));

  const my_message = Buffer.from(eContent);
  const sLen = 32;
  const keylen = 2048;
  const hash_algorithm = 'sha256';
  const emBits = keylen - 1;
  const emLen = Math.ceil(emBits / 8);
  const hLen = 32;

  console.log('my_message:', my_message);

  const private_key = {
    key: Buffer.from(privateKeyPem),
    padding: crypto.constants.RSA_NO_PADDING
  };

  const padding1 = Buffer.alloc(8);
  const hash1 = crypto.createHash(hash_algorithm);
  hash1.update(my_message);
  const mHash = hash1.digest();

  if (emLen < hLen + sLen + 2) {
    throw new Error('encoding error');
  }

  var padding2 = Buffer.alloc(emLen - sLen - hLen - 2);
  const DB = Buffer.concat([padding2, Buffer.from('01', 'hex'), salt]);

  const hash2 = crypto.createHash(hash_algorithm);
  hash2.update(Buffer.concat([padding1, mHash, salt]));

  const H = hash2.digest();
  const dbMask = MGF1(H, emLen - hLen - 1, hLen, hash_algorithm);
  var maskedDB = BufferXOR(DB, dbMask);
  var b = Buffer.concat([maskedDB, H, Buffer.from('bc', 'hex')]);
  var signature = crypto.privateEncrypt(private_key, b);
  const signatureArray = Array.from(signature, byte => byte < 128 ? byte : byte - 256);

  // const signatureBytes = Array.from(signature, (c: string) => c.charCodeAt(0));

  return {
    mrz: sampleMRZ,
    signatureAlgorithm: signatureAlgorithm,
    pubKey: {
      modulus: modulus,
      exponent: exponent,
    },
    dataGroupHashes: concatenatedDataHashes,
    eContent: eContent,
    encryptedDigest: signatureArray,
    photoBase64: "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABjElEQVR42mL8//8/AyUYiBQYmIw3..."
  }
}

function verify(passportData: PassportData): boolean {
  const { mrz, signatureAlgorithm, pubKey, dataGroupHashes, eContent, encryptedDigest } = passportData;
  const formattedMrz = formatMrz(mrz);
  const mrzHash = hash(signatureAlgorithm, formattedMrz);
  const dg1HashOffset = findSubarrayIndex(dataGroupHashes, mrzHash)
  assert(dg1HashOffset !== -1, 'MRZ hash index not found in dataGroupHashes');

  const concatHash = hash(signatureAlgorithm, dataGroupHashes)
  assert(
    arraysAreEqual(
      concatHash,
      eContent.slice(eContent.length - concatHash.length)
    ),
    'concatHash is not at the right place in eContent'
  );

  const modulus = new forge.jsbn.BigInteger(pubKey.modulus, 10);
  const exponent = new forge.jsbn.BigInteger(pubKey.exponent, 10);
  const publicKey = forge.pki.setRsaPublicKey(modulus, exponent);
  const pem = forge.pki.publicKeyToPem(publicKey);
  const rsa_public = Buffer.from(pem);

  const message = Buffer.from(eContent);
  const sLen = 32;
  const keylen = 2048;
  const signature = Buffer.from(encryptedDigest);
  const hash_algorithm = "sha256";
  const hLen = 32;

  assert(Buffer.isBuffer(rsa_public));
  assert.strictEqual(typeof keylen, "number");
  assert.strictEqual(typeof hash_algorithm, "string");
  assert(Buffer.isBuffer(message));
  assert.strictEqual(typeof sLen, "number");
  assert(Buffer.isBuffer(signature));

  const public_key = {
    key: rsa_public,
    padding: crypto.constants.RSA_NO_PADDING,
  };

  var m = crypto.publicDecrypt(public_key, signature);

  const emBits = keylen - 1;
  assert(hLen);
  const emLen = Math.ceil(emBits / 8);

  const hash1 = crypto.createHash(hash_algorithm);
  hash1.update(message);
  const mHash = hash1.digest();

  console.log("emLen", emLen);
  console.log("hLen", hLen);
  console.log("sLen", sLen);
  if (emLen < hLen + sLen + 2) throw new Error("inconsistent");

  if (m[m.length - 1] !== 0xbc) throw new Error("inconsistent");

  const maskedDB = m.slice(0, emLen - hLen - 1);
  const H = m.slice(emLen - hLen - 1, emLen - 1);

  // if ((maskedDB[0] & 0x80) !== 0x00) throw new Error("inconsistent");

  const dbMask = MGF1(H, emLen - hLen - 1, hLen, hash_algorithm);
  const DB = BufferXOR(maskedDB, dbMask);
  DB[0] = DB[0] & 0x7f;
  for (var i = 0; i < emLen - hLen - sLen - 2; i++) {
    assert.strictEqual(DB[i], 0x00);
  }
  assert.strictEqual(DB[emLen - hLen - sLen - 2], 0x01);
  const salt = DB.slice(-sLen);
  const MDash = Buffer.concat([Buffer.alloc(8), mHash, salt]);
  const hash2 = crypto.createHash(hash_algorithm);
  hash2.update(MDash);
  const HDash = hash2.digest();
  return HDash.equals(H);
}

function MGF1(mgfSeed: Buffer, maskLen: number, hLen: number, hash_algorithm: string) {
  if (maskLen > 0xffffffff * hLen) {
    throw new Error("mask too long");
  }
  var T = [];
  for (var i = 0; i <= Math.ceil(maskLen / hLen) - 1; i++) {
    var C = Buffer.alloc(4);
    C.writeUInt32BE(i);
    const hash3 = crypto.createHash(hash_algorithm);
    hash3.update(Buffer.concat([mgfSeed, C]));
    T.push(hash3.digest());
  }
  return Buffer.concat(T).slice(0, maskLen);
}

function BufferXOR(a: Buffer, b: Buffer) {
  assert(a.length === b.length, "Buffers must have the same length");
  var c = Buffer.alloc(a.length);
  for (var i = 0; i < a.length; i++) {
    c[i] = a[i] ^ b[i];
  }
  return c;
}


const mockPassportData = genMockPassportData_sha256WithRSASSAPSS_65537();
console.log("Passport Data:", JSON.stringify(mockPassportData, null, 2));
console.log("Signature valid:", verify(mockPassportData));

writeFileSync(__dirname + '/passportData.json', JSON.stringify(mockPassportData, null, 2));

