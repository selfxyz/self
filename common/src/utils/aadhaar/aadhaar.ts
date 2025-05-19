// eslint-disable-next-line @typescript-eslint/no-var-requires
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import dotenv from 'dotenv';

import { buildPoseidon } from 'circomlibjs';
import { sha256Pad } from '@zk-email/helpers/dist/sha-utils';
import {
  bufferToHex,
  Uint8ArrayToCharArray,
} from '@zk-email/helpers/dist/binary-format';
import {
  convertBigIntToByteArray,
  decompressByteArray,
  splitToWords
} from '@anon-aadhaar/core';

import { testQRData } from '../../../tests/aadhaar/dataInput.json';
import { packBytesAndPoseidon } from '../hash';
import {convertStringToByteArrayPad } from './utils';

dotenv.config();

interface AadhaarQRFields {
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

// const testSuite = process.env.FULL_TEST_SUITE === 'true' ? fullSigAlgs : sigAlgs;
let testAadhaar = true;
let QRData: string = testQRData;
if (process.env.REAL_DATA === 'true') {
  testAadhaar = false;
  if (typeof process.env.AADHAAR_QR_DATA === 'string') {
    QRData = process.env.AADHAAR_QR_DATA;
  } else {
    throw Error('You must set .env var AADHAAR_QR_DATA when using real data.');
  }
}

const getCertificate = (_isTest: boolean) => {
  return _isTest ? 'testPublicKey.pem' : 'uidai_offline_publickey_26022021.cer';
};

export function prepareTestData() {
  const qrDataBytes = convertBigIntToByteArray(BigInt(QRData));
  const decodedData = decompressByteArray(qrDataBytes);

  // last 256 bytes
  const signatureBytes = decodedData.slice(decodedData.length - 256, decodedData.length);
  //
  const signedData = decodedData.slice(0, decodedData.length - 256);

  const [qrDataPadded, qrDataPaddedLen] = sha256Pad(signedData, 512 * 3);

  const delimiterIndices: number[] = [];
  for (let i = 0; i < qrDataPadded.length; i++) {
    if (qrDataPadded[i] === 255) {
      delimiterIndices.push(i);
    }
    if (delimiterIndices.length === 18) {
      break;
    }
  }

  const signature = BigInt('0x' + bufferToHex(Buffer.from(signatureBytes)).toString());

  const pkPem = fs.readFileSync(
    path.join(__dirname, '../../../aadhaar', getCertificate(testAadhaar))
  );
  const pk = crypto.createPublicKey(pkPem);

  const pubKey = BigInt(
    '0x' + bufferToHex(Buffer.from(pk.export({ format: 'jwk' }).n as string, 'base64url'))
  );

  const inputs = {
    qrDataPadded: Uint8ArrayToCharArray(qrDataPadded),
    qrDataPaddedLength: qrDataPaddedLen,
    delimiterIndices: delimiterIndices,
    signature: splitToWords(signature, BigInt(121), BigInt(17)),
    pubKey: splitToWords(pubKey, BigInt(121), BigInt(17)),
    secret: 0,
  };

  return {
    inputs,
    qrDataPadded,
    signedData,
    decodedData,
    pubKey,
    qrDataPaddedLen,
    delimiterIndices,
  };
}

/**
 * Decode the 18 text fields + photo directly from the padded byte array,
 * using delimiterIndices supplied by prepareTestData().
 *
 * @param qrDataPadded   exact same string[] you put into the circuit
 * @param delimiterIdx   18-long array of indices of byte value 255
 */
export function splitTestData(qrDataPadded: Uint8Array, delimiterIdx: number[]): AadhaarQRFields {
  const fieldNames = [
    'undefined', // "V2"
    'Email_mobile_present_bit_indicator_value',
    'ReferenceId',
    'Name',
    'DOB',
    'Gender',
    'CareOf',
    'District',
    'Landmark',
    'House',
    'Location',
    'PinCode',
    'PostOffice',
    'State',
    'Street',
    'SubDistrict',
    'VTC',
    'PhoneNumberLast4',
    'Photo',
  ];

  if (delimiterIdx.length !== 18) throw new Error('Expected exactly 18 delimiter indices');

  let dataEnd = qrDataPadded.length;
  for (let i = qrDataPadded.length - 1; i >= 0; --i) {
    if (qrDataPadded[i] !== 0) {
      dataEnd = i + 1;
      break;
    }
  }

  const decoder = new TextDecoder('utf-8');
  const sliceField = (start: number, end: number) => qrDataPadded.subarray(start, end);

  const fields: Uint8Array[] = [];
  fields.push(sliceField(0, delimiterIdx[0]));
  for (let i = 0; i < 17; i++) {
    fields.push(sliceField(delimiterIdx[i] + 1, delimiterIdx[i + 1]));
  }

  fields.push(sliceField(delimiterIdx[17] + 1, dataEnd));
  const result: Partial<Record<(typeof fieldNames)[number] | 'Photo', any>> = {};

  fields.forEach((bytes, idx) => {
    if (idx < 18) {
      result[fieldNames[idx]] = decoder.decode(bytes);
    } else {
      result.Photo = bytes;
    }
  });
  // console.log(result);
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
  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  const sec = typeof secret === 'bigint' ? secret : BigInt(secret);

  const dataCommitment = packBytesAndPoseidon(Array.from(qrDataPadded));
  // console.log("dataCommitment",dataCommitment)
  const out = poseidon([sec, attestationId, dataCommitment]);
  const commitment = F.toObject(out);
  // console.log('Final commitment', commitment);
  return commitment;
}

export async function nameHash(namebytes: Uint8Array):Promise<string> {

  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  const namehash=packBytesAndPoseidon(Array.from(namebytes));
  // console.log(namehash);
  return namehash
}

export async function DobHash(dob:string):Promise<string>{
  const poseidon = await buildPoseidon();
  const F = poseidon.F;

  const day = parseInt(dob.slice(0, 2));
  const month = parseInt(dob.slice(3, 5));
  const year = parseInt(dob.slice(6, 10));

  const Dobhashout = poseidon([BigInt(year),BigInt(month),BigInt(day)]);
  const DobHash = F.toObject(Dobhashout);
  return DobHash;

}

export async function generateNullifier(Data: AadhaarQRFields) {

  const MAX_NAME_BYTES = 256;

  const nameBytes = convertStringToByteArrayPad(Data.Name, MAX_NAME_BYTES);
  const nameHashInt = BigInt(await nameHash(nameBytes)); 
  const dobHashInt = BigInt(await DobHash(Data.DOB)); 
  const genderInt = BigInt(Data.Gender.charCodeAt(0));
  const refIdBig = BigInt(Data.ReferenceId.slice(0,4));

  const poseidon = await buildPoseidon();
  const F = poseidon.F;

  const nullifier = F.toObject(
    poseidon([nameHashInt, dobHashInt, genderInt, refIdBig])
  );

  return nullifier;
}

