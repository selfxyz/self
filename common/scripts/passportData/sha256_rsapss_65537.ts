import assert from "assert";
import { PassportData } from "../../src/utils/types";
import { hash, assembleEContent, formatAndConcatenateDataHashes, formatMrz, arraysAreEqual, findSubarrayIndex } from "../../src/utils/utils";
import * as forge from 'node-forge';
import crypto from 'crypto';
import { readFileSync, writeFileSync } from "fs";
import { mock_dsc_key_sha256_rsapss_2048 } from "../../src/constants/mockCertificates";
import { mock_dsc_sha256_rsapss_2048 } from "../../src/constants/mockCertificates";
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
  const privateKeyPem = forge.pki.privateKeyFromPem(mock_dsc_key_sha256_rsapss_2048);
  const privateKeyPemString = forge.pki.privateKeyToPem(privateKeyPem);
  const certificate = forge.pki.certificateFromPem(mock_dsc_sha256_rsapss_2048);

  const publicKey = certificate.publicKey as forge.pki.rsa.PublicKey;

  const modulus = (publicKey as any).n.toString(10);
  const exponent = (publicKey as any).e.toString(10);
  const salt = Buffer.from('dee959c7e06411361420ff80185ed57f3e6776afdee959c7e064113614201420', 'hex');

  const mrzHash = hash(signatureAlgorithm, formatMrz(sampleMRZ));
  const concatenatedDataHashes = formatAndConcatenateDataHashes(
    [[1, mrzHash], ...sampleDataHashes],
    hashLen,
    30
  );

  const eContent = assembleEContent(hash(signatureAlgorithm, concatenatedDataHashes));

  const my_message = Buffer.from(eContent);
  const hash_algorithm = 'sha256';

  const private_key = {
    key: privateKeyPemString,
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
  const dg1HashOffset = findSubarrayIndex(dataGroupHashes, mrzHash)
  console.log('dg1HashOffset', dg1HashOffset);
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
  const signature = Buffer.from(encryptedDigest);
  const hash_algorithm = "sha256";

  const public_key = {
    key: rsa_public,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32,
  };

  const isVerified = crypto.verify(hash_algorithm, message, public_key, signature);

  return isVerified;
}

const mockPassportData = genMockPassportData_sha256WithRSASSAPSS_65537();
console.log("Passport Data:", JSON.stringify(mockPassportData, null, 2));
console.log("Signature valid:", verify(mockPassportData));

writeFileSync(__dirname + '/passportData.json', JSON.stringify(mockPassportData, null, 2));