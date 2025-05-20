// eslint-disable-next-line @typescript-eslint/no-var-requires
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import dotenv from 'dotenv';

import { buildPoseidon } from 'circomlibjs';
import { sha256Pad } from '@zk-email/helpers/dist/sha-utils';
import { bufferToHex, Uint8ArrayToCharArray } from '@zk-email/helpers/dist/binary-format';
import { convertBigIntToByteArray, decompressByteArray, splitToWords } from '@anon-aadhaar/core';

import { testQRData } from '../../../tests/aadhaar/dataInput.json';
import { packBytesAndPoseidon } from '../hash';
import { convertStringToByteArrayPad } from './utils';

import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { SMT } from '@openpassport/zk-kit-smt';
import { poseidon1, poseidon2 } from 'poseidon-lite';

import { AADHAAR_ATTESTATION_ID } from '../../../src/constants/constants';
import nameAndDobjson from '../../../ofacdata/outputs/nameAndDobSMT.json';
import nameAndYobjson from '../../../ofacdata/outputs/nameAndYobSMT.json';

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

const today = new Date();
const yyyy = today.getFullYear().toString();  // "2025"
const mm = (today.getMonth() + 1).toString().padStart(2, '0'); // "05"
const dd = today.getDate().toString().padStart(2, '0');        // "20"

const current_date = [
  parseInt(yyyy[0]), parseInt(yyyy[1]),
  parseInt(yyyy[2]), parseInt(yyyy[3]),
  parseInt(mm[0]), parseInt(mm[1]),
  parseInt(dd[0]), parseInt(dd[1]),
].slice(-6); 

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
    current_date: current_date,
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

export function prepareTestDataDisclosure(){

  const qrDataBytes = convertBigIntToByteArray(BigInt(QRData));
  const decodedData = decompressByteArray(qrDataBytes);

  // last 256 bytes
  const signatureBytes = decodedData.slice(decodedData.length - 256, decodedData.length);
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

  const secret = BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString();
  const majority = '18';
  const user_identifier = crypto.randomUUID();

  const selector_older_than = '1';
  const scope = '@coboyApp';
  const attestation_id = AADHAAR_ATTESTATION_ID;

  // // compute the commitment and insert it in the tree
  // const commitment = generateCommitment(secret, attestation_id, passportData);
  // console.log('commitment in js ', commitment);
  // const tree: any = new LeanIMT((a, b) => poseidon2([a, b]), []);
  // tree.insert(BigInt(commitment));


  const nameAndDob_smt = new SMT(poseidon2, true);
  nameAndDob_smt.import(nameAndDobjson);

  const nameAndYob_smt = new SMT(poseidon2, true);
  nameAndYob_smt.import(nameAndYobjson);


    // signal input merkle_root;
    // signal input leaf_depth;
    // signal input path[nLevels];
    // signal input siblings[nLevels];


    // //age related
    // signal input majority[2];
    // signal input current_date[6];

    // //selector bitmaps
    // signal input revealAgeolderthan;
    // signal input revealGender;
    // signal input revealPinCode;
    // signal input revealState;
    // signal input selector_ofac;
        //OFAC Checks


  const inputs = {
    qrDataPadded: Uint8ArrayToCharArray(qrDataPadded),
    qrDataPaddedLength: qrDataPaddedLen,
    delimiterIndices: delimiterIndices,
    signature: splitToWords(signature, BigInt(121), BigInt(17)),
    pubKey: splitToWords(pubKey, BigInt(121), BigInt(17)),
    secret: secret,
    current_date: current_date,
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

export async function nameHash(namebytes: Uint8Array): Promise<string> {
  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  const namehash = packBytesAndPoseidon(Array.from(namebytes));
  // console.log(namehash);
  return namehash;
}

export async function DobHash(dob: string): Promise<string> {
  const poseidon = await buildPoseidon();
  const F = poseidon.F;

  const day = parseInt(dob.slice(0, 2));
  const month = parseInt(dob.slice(3, 5));
  const year = parseInt(dob.slice(6, 10));

  const Dobhashout = poseidon([BigInt(year), BigInt(month), BigInt(day)]);
  const DobHash = F.toObject(Dobhashout);
  return DobHash;
}

export async function generateNullifier(Data: AadhaarQRFields) {
  const MAX_NAME_BYTES = 256;

  const nameBytes = convertStringToByteArrayPad(Data.Name, MAX_NAME_BYTES);
  const nameHashInt = BigInt(await nameHash(nameBytes));
  const dobHashInt = BigInt(await DobHash(Data.DOB));
  const genderInt = BigInt(Data.Gender.charCodeAt(0));
  const refIdBig = BigInt(Data.ReferenceId.slice(0, 4));

  const poseidon = await buildPoseidon();
  const F = poseidon.F;

  const nullifier = F.toObject(poseidon([nameHashInt, dobHashInt, genderInt, refIdBig]));

  return nullifier;
}
