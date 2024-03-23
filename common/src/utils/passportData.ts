import { PassportData } from "./types";
import { hash, assembleEContent, formatAndConcatenateDataHashes, formatMrz, hexToDecimal } from "./utils";
import * as forge from 'node-forge';
const fs = require('fs');
const path = require('path');

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
const sampleTimeOfSig = [49, 15, 23, 13, 49, 57, 49, 50, 49, 54, 49, 55, 50, 50, 51, 56, 90]

export function genSampleData(YYMMDD?: string): PassportData {
  let modifiedMRZ = sampleMRZ;
  if (YYMMDD) {
    // Logic to replace the relevant part of the MRZ with YYMMDD
    // Assuming the format of sampleMRZ and where 040211 appears is known
    modifiedMRZ = replaceYYMMDDinMRZ(modifiedMRZ, YYMMDD);
  }
  console.log(modifiedMRZ);

  // Proceed with the rest of your function using modifiedMRZ instead of sampleMRZ
  const mrzHash = hash(formatMrz(modifiedMRZ));
  sampleDataHashes.unshift([1, mrzHash]);
  const concatenatedDataHashes = formatAndConcatenateDataHashes(
    mrzHash,
    sampleDataHashes as [number, number[]][],
  );

  const eContent = assembleEContent(
    hash(concatenatedDataHashes),
    sampleTimeOfSig,
  );

  const rsa = forge.pki.rsa;
  const privKey = rsa.generateKeyPair({ bits: 2048 }).privateKey;
  const modulus = privKey.n.toString(16);

  const md = forge.md.sha256.create();
  md.update(forge.util.binary.raw.encode(new Uint8Array(eContent)));

  const signature = privKey.sign(md)
  const signatureBytes = Array.from(signature, (c: string) => c.charCodeAt(0));

  return {
    mrz: sampleMRZ,
    signatureAlgorithm: 'sha256WithRSAEncryption',
    pubKey: {
      modulus: hexToDecimal(modulus),
      exponent: '65537',
    },
    dataGroupHashes: concatenatedDataHashes,
    eContent: eContent,
    encryptedDigest: signatureBytes,
    photoBase64: "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABjElEQVR42mL8//8/AyUYiBQYmIw3" // meaningless for now
  }
}

function replaceYYMMDDinMRZ(mrz: string, YYMMDD: string): string {
  // Ensure YYMMDD is exactly 6 characters as expected for this operation
  if (YYMMDD.length !== 6) {
    throw new Error("YYMMDD must be exactly 6 characters.");
  }

  // MRZ is typically a string where characters might need to be replaced at specific positions.
  // The positions in a string are 0-indexed, so positions 57-63 correspond to array indices 56-62.
  return (
    mrz.substring(0, 56) + // Keep the part of MRZ before the target positions
    YYMMDD +                // Insert the new YYMMDD value
    mrz.substring(62)       // Append the part of MRZ after the target positions
  );
}


export function getPassportData(): PassportData {
  const passportDataPath = path.join(__dirname, '../../inputs/passportData_flo.json');

  if (false) {
    // if ( fs.existsSync(passportDataPath)) {
    return require(passportDataPath);
  } else {
    const sampleData = genSampleData();
    const inputsDir = path.join(__dirname, '../../inputs/');

    if (!fs.existsSync(inputsDir)) {
      fs.mkdirSync(inputsDir);
    }

    fs.writeFileSync(passportDataPath, JSON.stringify(sampleData));
    return sampleData;
  }
}