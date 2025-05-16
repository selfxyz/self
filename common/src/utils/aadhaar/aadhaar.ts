// eslint-disable-next-line @typescript-eslint/no-var-requires

import { poseidon5 } from 'poseidon-lite';
import { hashAlgos, MAX_PUBKEY_DSC_BYTES } from '../../constants/constants';
import { PassportData, SignatureAlgorithm } from '../types';
import { customHasher, hash, packBytesAndPoseidon  } from '../hash';
import { bytesToBigDecimal, hexToDecimal } from '../bytes';

import fs from 'fs'
import crypto from 'crypto'
import assert from 'assert'
import path from 'path'
import dotenv from 'dotenv'

import { sha256Pad } from '@zk-email/helpers/dist/sha-utils'
import {
  bigIntToChunkedBytes,
  bufferToHex,
  Uint8ArrayToCharArray,
} from '@zk-email/helpers/dist/binary-format'
import {
  convertBigIntToByteArray,
  decompressByteArray,
  splitToWords,
  extractPhoto,
  timestampToUTCUnix,
} from '@anon-aadhaar/core'

import { buildPoseidon } from 'circomlibjs'

import { testQRData } from '../../../tests/aadhaar/dataInput.json'
import { bytesToIntChunks, padArrayWithZeros, bigIntsToString, ProcessReferenceId } from './utils'

dotenv.config();

// const testSuite = process.env.FULL_TEST_SUITE === 'true' ? fullSigAlgs : sigAlgs;
let testAadhaar = true
let QRData: string = testQRData
if (process.env.REAL_DATA === 'true') {
  testAadhaar = false
  if (typeof process.env.AADHAAR_QR_DATA === 'string') {
    QRData = process.env.AADHAAR_QR_DATA
  } else {
    throw Error('You must set .env var AADHAAR_QR_DATA when using real data.')
  }
}

const getCertificate = (_isTest: boolean) => {
  return _isTest ? 'testPublicKey.pem' : 'uidai_offline_publickey_26022021.cer'
}

export function prepareTestData() {
  const qrDataBytes = convertBigIntToByteArray(BigInt(QRData))
  const decodedData = decompressByteArray(qrDataBytes)

  // last 256 bytes
  const signatureBytes = decodedData.slice(
    decodedData.length - 256,
    decodedData.length,
  )
  //
  const signedData = decodedData.slice(0, decodedData.length - 256)

  const [qrDataPadded, qrDataPaddedLen] = sha256Pad(signedData, 512 * 3)

  const delimiterIndices: number[] = []
  for (let i = 0; i < qrDataPadded.length; i++) {
    if (qrDataPadded[i] === 255) {
      delimiterIndices.push(i)
    }
    if (delimiterIndices.length === 18) {
      break
    }
  }

  const signature = BigInt(
    '0x' + bufferToHex(Buffer.from(signatureBytes)).toString(),
  )

  const pkPem = fs.readFileSync(
    path.join(__dirname, '../../../aadhaar', getCertificate(testAadhaar)),
  )
  const pk = crypto.createPublicKey(pkPem)

  const pubKey = BigInt(
    '0x' +
      bufferToHex(
        Buffer.from(pk.export({ format: 'jwk' }).n as string, 'base64url'),
      ),
  )

  const inputs = {
    qrDataPadded: Uint8ArrayToCharArray(qrDataPadded),
    qrDataPaddedLength: qrDataPaddedLen,
    delimiterIndices: delimiterIndices,
    signature: splitToWords(signature, BigInt(121), BigInt(17)),
    pubKey: splitToWords(pubKey, BigInt(121), BigInt(17)),
    secret : 0
  }

  return {
    inputs,
    qrDataPadded,
    signedData,
    decodedData,
    pubKey,
    qrDataPaddedLen,
    delimiterIndices
  }
}

export interface AadhaarQRFields {
  undefined: string; // actually "V2"
  Email_mobile_present_bit_indicator_value: string;
  ReferenceId: string;
  Name: string;
  DOB: string;
  Gender: string;
  CareOf: string;
  District: string;
  Landmark: string;
  House: string;
  Location: string;
  PinCode: string;
  PostOffice: string;
  State: string;
  Street: string;
  SubDistrict: string;
  VTC: string;
  PhoneNumberLast4: string;
  Photo: Uint8Array;        
}

/**
 * Decode the 18 text fields + photo directly from the padded byte array,
 * using delimiterIndices supplied by prepareTestData().
 *
 * @param qrDataPadded   exact same string[] you put into the circuit
 * @param delimiterIdx   18-long array of indices of byte value 255
 * @param origLen        optional: signedData length (lets us strip padding)
 */
export function splitTestData(
  qrDataPadded : Uint8Array,
  delimiterIdx : number[]
): AadhaarQRFields {

  const fieldNames = [
    "undefined", // "V2"
    "Email_mobile_present_bit_indicator_value",
    "ReferenceId",
    "Name",
    "DOB",
    "Gender",
    "CareOf",
    "District",
    "Landmark",
    "House",
    "Location",
    "PinCode",
    "PostOffice",
    "State",
    "Street",
    "SubDistrict",
    "VTC",
    "PhoneNumberLast4",
    "Photo",
  ]

  if (delimiterIdx.length !== 18)
    throw new Error("Expected exactly 18 delimiter indices");

  let dataEnd = qrDataPadded.length;
  for (let i = qrDataPadded.length - 1; i >= 0; --i) {
    if (qrDataPadded[i] !== 0) {
      dataEnd = i + 1;
      break;
    }
  }

  const decoder = new TextDecoder("utf-8");
  const sliceField = (start: number, end: number) => qrDataPadded.subarray(start, end);

  const fields: Uint8Array[] = [];
   // 0: from 0 to first delimiter
  fields.push(sliceField(0, delimiterIdx[0]));
  // 1–17: between delimiters
  for (let i = 0; i < 17; i++) {
    fields.push(sliceField(delimiterIdx[i] + 1, delimiterIdx[i + 1]));
  }

  // 18: photo blob from after 18th delimiter up to dataEnd
  fields.push(sliceField(delimiterIdx[17] + 1, dataEnd));
  // ❸  decode text fields, leave photo as raw bytes
  const result: Partial<Record<typeof fieldNames[number] | "Photo", any>> = {};

  fields.forEach((bytes, idx) => {
    if (idx < 18) {
      result[fieldNames[idx]] = decoder.decode(bytes);
    } else {
      result.Photo = bytes;
    }
  });

  return result as AadhaarQRFields;
}

/**
 * Compute the Aadhaar commitment exactly as
 *   `commitment <== Poseidon(3)([secret, attestation_id, Datacommitment])`
 * in your Circom circuit.
 *
 * @param secret          small field element (BigInt or number)
 * @param attestationId   full ReferenceId as a BigInt
 * @param qrDataPadded    the padded QR‐data buffer (Uint8Array)
 * @returns               the Poseidon commitment as a BigInt
 */
export async function generateCommitmentAadhaar(
  secret: number | bigint,
  attestationId: bigint,
  qrDataPadded: Uint8Array
): Promise<bigint> {
  const poseidon = await buildPoseidon()
  const F = poseidon.F
  const sec = typeof secret === 'bigint' ? secret : BigInt(secret)

  const dataCommitment= packBytesAndPoseidon(Array.from(qrDataPadded))
  console.log(dataCommitment)
  const out = poseidon([ sec, attestationId, dataCommitment])
  // console.log(out)
  console.log("Final commitment",F.toObject(out))
  return F.toObject(out)
}


// export function generateNullifier(passportData: PassportData) {
//   const signedAttr_shaBytes = hash(
//     passportData.passportMetadata.signedAttrHashFunction,
//     Array.from(passportData.signedAttr),
//     'bytes'
//   );
//   const signedAttr_packed_hash = packBytesAndPoseidon(
//     (signedAttr_shaBytes as number[]).map((byte) => byte & 0xff)
//   );
//   return signedAttr_packed_hash;
// }

// export function pad(hashFunction: (typeof hashAlgos)[number]) {
//   return hashFunction === 'sha1' || hashFunction === 'sha224' || hashFunction === 'sha256'
//     ? shaPad
//     : sha384_512Pad;
// }

// export function padWithZeroes(bytes: number[], length: number) {
//   return bytes.concat(new Array(length - bytes.length).fill(0));
// }

// /// @notice Get the public key from the certificate padded as per the DSC circuit's requirements.
// export function formatCertificatePubKeyDSC(
//   certificateData: CertificateData,
//   signatureAlgorithm: string
// ): string[] {
//   const { publicKeyDetails } = certificateData;
//   if (signatureAlgorithm === 'ecdsa') {
//     const { x, y } = publicKeyDetails as PublicKeyDetailsECDSA;
//     // const normalizedX = x.length % 2 === 0 ? x : '0' + x;
//     // const normalizedY = y.length % 2 === 0 ? y : '0' + y;
//     const fullPubKey = x + y;

//     // Splits to 525 words of 8 bits each
//     return splitToWords(BigInt(hexToDecimal(fullPubKey)), 8, 525);
//   } else {
//     // Splits to 525 words of 8 bits each
//     const { modulus } = publicKeyDetails as PublicKeyDetailsRSA;
//     return splitToWords(BigInt(hexToDecimal(modulus)), 8, 525);
//   }
// }




