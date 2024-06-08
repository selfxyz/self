import assert from "assert";
import { PassportData } from "../../../common/src/utils/types";
import { hash, assembleEContent, formatAndConcatenateDataHashes, formatMrz, arraysAreEqual } from "../../../common/src/utils/utils";
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
]
const signatureAlgorithm = 'rsassaPss'

export function genMockPassportData_rsassaPss_65537(): PassportData {
  const keypair = forge.pki.rsa.generateKeyPair(2048);
  const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);

  const publicKey = keypair.publicKey;
  const modulus = publicKey.n.toString(10);
  const exponent = publicKey.e.toString(10);
  const salt = Buffer.from('dee959c7e06411361420ff80185ed57f3e6776afdee959c7e064113614201420', 'hex');

  const mrzHash = hash(signatureAlgorithm, formatMrz(sampleMRZ));
  sampleDataHashes.unshift([1, mrzHash]);
  const concatenatedDataHashes = formatAndConcatenateDataHashes(
    mrzHash,
    sampleDataHashes as [number, number[]][],
  );

  const eContent = assembleEContent(hash(signatureAlgorithm, concatenatedDataHashes));

  const my_message = Buffer.from(eContent);
  const hash_algorithm = 'sha256';

  const private_key = {
    key: privateKeyPem,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: salt.length,
  };

  const signature = crypto.sign(hash_algorithm, my_message, private_key);
  const signatureArray = Array.from(signature, byte => byte < 128 ? byte : byte - 256);

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

  console.log("mrzHash", mrzHash);
  assert(
    arraysAreEqual(mrzHash, dataGroupHashes.slice(31, 31 + mrzHash.length)),
    'mrzHash is at the right place in dataGroupHashes'
  );

  const modulus = new forge.jsbn.BigInteger(pubKey.modulus, 10);
  const exponent = new forge.jsbn.BigInteger(pubKey.exponent, 10);
  const publicKey = forge.pki.setRsaPublicKey(modulus, exponent);
  const pem = forge.pki.publicKeyToPem(publicKey);
  const rsa_public = Buffer.from(pem);

  const message = Buffer.from(eContent);
  const signature = Buffer.from(encryptedDigest);
  const hash_algorithm = "sha256";

  assert(Buffer.isBuffer(rsa_public));
  assert.strictEqual(typeof hash_algorithm, "string");
  assert(Buffer.isBuffer(message));
  assert(Buffer.isBuffer(signature));

  const public_key = {
    key: rsa_public,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32,
  };

  const isVerified = crypto.verify(hash_algorithm, message, public_key, signature);

  return isVerified;
}

const mockPassportData = genMockPassportData_rsassaPss_65537();
console.log("Passport Data:", JSON.stringify(mockPassportData, null, 2));
console.log("Signature valid:", verify(mockPassportData));

writeFileSync(__dirname + '/passportData.json', JSON.stringify(mockPassportData, null, 2));