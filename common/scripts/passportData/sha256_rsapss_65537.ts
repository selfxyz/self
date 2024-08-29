import assert from "assert";
import { PassportData } from "../../src/utils/types";
import { hash, assembleEContent, formatAndConcatenateDataHashes, formatMrz, arraysAreEqual, findSubarrayIndex } from "../../src/utils/utils";
import * as forge from 'node-forge';
import crypto from 'crypto';
import { readFileSync, writeFileSync } from "fs";
import { mock_dsc_key_sha256_rsapss_2048 } from "../../src/constants/mockCertificates";
import { mock_dsc_sha256_rsapss_2048 } from "../../src/constants/mockCertificates";
import { sampleDataHashes_large } from "../../src/constants/sampleDataHashes";

const sampleMRZ = "P<FRADUPONT<<ALPHONSE<HUGUES<ALBERT<<<<<<<<<24HB818324FRA0402111M3111115<<<<<<<<<<<<<<02"
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
    [[1, mrzHash], ...sampleDataHashes_large],
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