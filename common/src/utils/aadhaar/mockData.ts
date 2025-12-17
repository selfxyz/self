import forge from 'node-forge';
import { poseidon5 } from 'poseidon-lite';

import { COMMITMENT_TREE_DEPTH } from '../../constants/constants.js';
import { formatCountriesList } from '../circuits/formatInputs.js';
import { findIndexInTree, formatInput } from '../circuits/generateInputs.js';
import { packBytesAndPoseidon } from '../hash.js';
import { shaPad } from '../shaPad.js';
import {
  generateMerkleProof,
  generateSMTProof,
  getNameDobLeafAadhaar,
  getNameYobLeafAahaar,
} from '../trees.js';
import { testQRData } from './assets/dataInput.js';
import { AadhaarField, createSelector } from './constants.js';
import {
  calculateAge,
  extractQRDataFields,
  generateTestData,
  stringToAsciiArray,
  testCustomData,
} from './utils.js';

import {
  convertBigIntToByteArray,
  decompressByteArray,
  extractPhoto,
  splitToWords,
} from '@anon-aadhaar/core';
import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { SMT } from '@openpassport/zk-kit-smt';
import { bufferToHex, Uint8ArrayToCharArray } from '@zk-email/helpers/dist/binary-format.js';
import { sha256Pad } from '@zk-email/helpers/dist/sha-utils.js';

// Helper function to compute padded name
function computePaddedName(name: string): number[] {
  return name
    .padEnd(62, '\0')
    .split('')
    .map((char) => char.charCodeAt(0));
}

function computeUppercasePaddedName(name: string): number[] {
  return name
    .toUpperCase()
    .padEnd(62, '\0')
    .split('')
    .map((char) => char.charCodeAt(0));
}

// Helper function to compute final commitment
export function computeCommitment(
  secret: bigint,
  qrHash: bigint,
  nullifier: bigint,
  packedCommitment: bigint,
  photoHash: bigint
): bigint {
  return poseidon5([secret, qrHash, nullifier, packedCommitment, photoHash]);
}

// Helper function to compute packed commitment
export function computePackedCommitment(
  extractedFields: ReturnType<typeof extractQRDataFields>
): bigint {
  const packedCommitmentArgs = [
    3,
    ...stringToAsciiArray(extractedFields.pincode),
    ...stringToAsciiArray(extractedFields.state.padEnd(31, '\0')),
    ...stringToAsciiArray(extractedFields.phoneNoLast4Digits),
    ...stringToAsciiArray(extractedFields.name.padEnd(62, '\0')),
  ];
  return BigInt(packBytesAndPoseidon(packedCommitmentArgs));
}

export function convertByteArrayToBigInt(byteArray: Uint8Array | number[]): bigint {
  let result = 0n;
  for (let i = 0; i < byteArray.length; i++) {
    result = result * 256n + BigInt(byteArray[i]);
  }
  return result;
}

interface SharedQRData {
  qrDataBytes: any;
  decodedData: Uint8Array;
  signedData: Uint8Array;
  qrDataPadded: Uint8Array;
  qrDataPaddedLen: number;
  extractedFields: ReturnType<typeof extractQRDataFields>;
  qrHash: bigint;
  photo: { bytes: number[] };
  photoHash: bigint;
}

// Helper function to compute nullifier
export function nullifierHash(extractedFields: ReturnType<typeof extractQRDataFields>): bigint {
  const genderAscii = stringToAsciiArray(extractedFields.gender)[0];
  const personalInfoHashArgs = [
    genderAscii,
    ...stringToAsciiArray(extractedFields.yob),
    ...stringToAsciiArray(extractedFields.mob),
    ...stringToAsciiArray(extractedFields.dob),
    ...stringToAsciiArray(extractedFields.name.toUpperCase().padEnd(62, '\0')),
    ...stringToAsciiArray(extractedFields.aadhaarLast4Digits),
  ];
  return BigInt(packBytesAndPoseidon(personalInfoHashArgs));
}

export function prepareAadhaarDiscloseData(
  qrData: string,
  identityTree: LeanIMT,
  nameAndDob_smt: SMT,
  nameAndYob_smt: SMT,
  scope: string,
  secret: string,
  user_identifier: string,
  discloseAttributes: {
    dateOfBirth?: boolean;
    name?: boolean;
    gender?: boolean;
    idNumber?: boolean;
    issuingState?: boolean;
    minimumAge?: number;
    forbiddenCountriesListPacked?: string[];
    ofac?: boolean;
  }
) {
  const sharedData = processQRDataSimple(qrData);

  const { currentYear, currentMonth, currentDay } = calculateAge(
    sharedData.extractedFields.dob,
    sharedData.extractedFields.mob,
    sharedData.extractedFields.yob
  );

  const genderAscii = stringToAsciiArray(sharedData.extractedFields.gender)[0];
  const nullifier = nullifierHash(sharedData.extractedFields);
  const packedCommitment = computePackedCommitment(sharedData.extractedFields);
  const commitment = computeCommitment(
    BigInt(secret),
    BigInt(sharedData.qrHash),
    nullifier,
    packedCommitment,
    BigInt(sharedData.photoHash)
  );

  const paddedName = computePaddedName(sharedData.extractedFields.name);

  const index = findIndexInTree(identityTree, BigInt(commitment));
  const {
    siblings,
    path: merkle_path,
    leaf_depth,
  } = generateMerkleProof(identityTree, index, COMMITMENT_TREE_DEPTH);

  const namedob_leaf = getNameDobLeafAadhaar(
    sharedData.extractedFields.name,
    sharedData.extractedFields.yob,
    sharedData.extractedFields.mob,
    sharedData.extractedFields.dob
  );
  const nameyob_leaf = getNameYobLeafAahaar(
    sharedData.extractedFields.name,
    sharedData.extractedFields.yob
  );

  const {
    root: ofac_name_dob_smt_root,
    closestleaf: ofac_name_dob_smt_leaf_key,
    siblings: ofac_name_dob_smt_siblings,
  } = generateSMTProof(nameAndDob_smt, namedob_leaf);

  const {
    root: ofac_name_yob_smt_root,
    closestleaf: ofac_name_yob_smt_leaf_key,
    siblings: ofac_name_yob_smt_siblings,
  } = generateSMTProof(nameAndYob_smt, nameyob_leaf);

  const selectorArr: AadhaarField[] = [];
  if (discloseAttributes.dateOfBirth) {
    selectorArr.push('YEAR_OF_BIRTH');
    selectorArr.push('MONTH_OF_BIRTH');
    selectorArr.push('DAY_OF_BIRTH');
  }
  if (discloseAttributes.name) {
    selectorArr.push('NAME');
  }
  if (discloseAttributes.gender) {
    selectorArr.push('GENDER');
  }
  if (discloseAttributes.idNumber) {
    selectorArr.push('AADHAAR_LAST_4_DIGITS');
  }
  if (discloseAttributes.issuingState) {
    selectorArr.push('STATE');
  }
  if (discloseAttributes.ofac) {
    selectorArr.push('OFAC_NAME_DOB_CHECK');
    selectorArr.push('OFAC_NAME_YOB_CHECK');
  }

  const selector = createSelector(selectorArr);

  const inputs = {
    attestation_id: '3',
    secret,
    qrDataHash: formatInput(BigInt(sharedData.qrHash)),
    gender: formatInput(genderAscii),
    yob: stringToAsciiArray(sharedData.extractedFields.yob),
    mob: stringToAsciiArray(sharedData.extractedFields.mob),
    dob: stringToAsciiArray(sharedData.extractedFields.dob),
    name: formatInput(paddedName),
    aadhaar_last_4digits: stringToAsciiArray(sharedData.extractedFields.aadhaarLast4Digits),
    pincode: stringToAsciiArray(sharedData.extractedFields.pincode),
    state: stringToAsciiArray(sharedData.extractedFields.state.padEnd(31, '\0')),
    ph_no_last_4digits: stringToAsciiArray(sharedData.extractedFields.phoneNoLast4Digits),
    photoHash: formatInput(BigInt(sharedData.photoHash)),
    merkle_root: formatInput(BigInt(identityTree.root)),
    leaf_depth: formatInput(leaf_depth),
    path: formatInput(merkle_path),
    siblings: formatInput(siblings),
    ofac_name_dob_smt_leaf_key: formatInput(BigInt(ofac_name_dob_smt_leaf_key)),
    ofac_name_dob_smt_root: formatInput(BigInt(ofac_name_dob_smt_root)),
    ofac_name_dob_smt_siblings: formatInput(ofac_name_dob_smt_siblings),
    ofac_name_yob_smt_leaf_key: formatInput(BigInt(ofac_name_yob_smt_leaf_key)),
    ofac_name_yob_smt_root: formatInput(BigInt(ofac_name_yob_smt_root)),
    ofac_name_yob_smt_siblings: formatInput(ofac_name_yob_smt_siblings),
    selector: formatInput(selector),
    minimumAge: formatInput(discloseAttributes.minimumAge ?? 0),
    currentYear: formatInput(currentYear),
    currentMonth: formatInput(currentMonth),
    currentDay: formatInput(currentDay),
    scope: formatInput(BigInt(scope)),
    user_identifier: formatInput(BigInt(user_identifier)),
    forbidden_countries_list: discloseAttributes.forbiddenCountriesListPacked
      ? formatInput(formatCountriesList(discloseAttributes.forbiddenCountriesListPacked))
      : formatInput([...Array(120)].map((_) => '0')),
  };

  return inputs;
}

export function prepareAadhaarDiscloseTestData(
  privateKeyPem: string,
  merkletree: LeanIMT,
  nameAndDob_smt: SMT,
  nameAndYob_smt: SMT,
  scope: string,
  secret: string,
  user_identifier: string,
  selector: string,
  name?: string,
  dateOfBirth?: string,
  gender?: string,
  pincode?: string,
  state?: string,
  timestamp?: string,
  updateTree?: boolean
) {
  const sharedData = processQRData(
    privateKeyPem,
    name,
    dateOfBirth,
    gender,
    pincode,
    state,
    timestamp
  );

  const { age, currentYear, currentMonth, currentDay } = calculateAge(
    sharedData.extractedFields.dob,
    sharedData.extractedFields.mob,
    sharedData.extractedFields.yob
  );

  const genderAscii = stringToAsciiArray(sharedData.extractedFields.gender)[0];
  const nullifier = nullifierHash(sharedData.extractedFields);
  const packedCommitment = computePackedCommitment(sharedData.extractedFields);
  const commitment = computeCommitment(
    BigInt(secret),
    BigInt(sharedData.qrHash),
    nullifier,
    packedCommitment,
    BigInt(sharedData.photoHash)
  );

  const paddedName = computePaddedName(sharedData.extractedFields.name);

  if (updateTree) {
    merkletree.insert(BigInt(commitment));
  }

  const index = findIndexInTree(merkletree, BigInt(commitment));
  const {
    siblings,
    path: merkle_path,
    leaf_depth,
  } = generateMerkleProof(merkletree, index, COMMITMENT_TREE_DEPTH);

  const namedob_leaf = getNameDobLeafAadhaar(
    sharedData.extractedFields.name,
    sharedData.extractedFields.yob,
    sharedData.extractedFields.mob,
    sharedData.extractedFields.dob
  );
  const nameyob_leaf = getNameYobLeafAahaar(
    sharedData.extractedFields.name,
    sharedData.extractedFields.yob
  );

  const {
    root: ofac_name_dob_smt_root,
    closestleaf: ofac_name_dob_smt_leaf_key,
    siblings: ofac_name_dob_smt_siblings,
  } = generateSMTProof(nameAndDob_smt, namedob_leaf);

  const {
    root: ofac_name_yob_smt_root,
    closestleaf: ofac_name_yob_smt_leaf_key,
    siblings: ofac_name_yob_smt_siblings,
  } = generateSMTProof(nameAndYob_smt, nameyob_leaf);

  const inputs = {
    attestation_id: '3',
    secret: secret,
    qrDataHash: BigInt(sharedData.qrHash).toString(),
    gender: genderAscii.toString(),
    yob: stringToAsciiArray(sharedData.extractedFields.yob),
    mob: stringToAsciiArray(sharedData.extractedFields.mob),
    dob: stringToAsciiArray(sharedData.extractedFields.dob),
    name: formatInput(paddedName),
    aadhaar_last_4digits: stringToAsciiArray(sharedData.extractedFields.aadhaarLast4Digits),
    pincode: stringToAsciiArray(sharedData.extractedFields.pincode),
    state: stringToAsciiArray(sharedData.extractedFields.state.padEnd(31, '\0')),
    ph_no_last_4digits: stringToAsciiArray(sharedData.extractedFields.phoneNoLast4Digits),
    photoHash: formatInput(BigInt(sharedData.photoHash)),
    merkle_root: formatInput(BigInt(merkletree.root)),
    leaf_depth: formatInput(leaf_depth),
    path: formatInput(merkle_path),
    siblings: formatInput(siblings),
    ofac_name_dob_smt_leaf_key: formatInput(BigInt(ofac_name_dob_smt_leaf_key)),
    ofac_name_dob_smt_root: formatInput(BigInt(ofac_name_dob_smt_root)),
    ofac_name_dob_smt_siblings: formatInput(ofac_name_dob_smt_siblings),
    ofac_name_yob_smt_leaf_key: formatInput(BigInt(ofac_name_yob_smt_leaf_key)),
    ofac_name_yob_smt_root: formatInput(BigInt(ofac_name_yob_smt_root)),
    ofac_name_yob_smt_siblings: formatInput(ofac_name_yob_smt_siblings),
    selector,
    minimumAge: formatInput(age - 2),
    currentYear: formatInput(currentYear),
    currentMonth: formatInput(currentMonth),
    currentDay: formatInput(currentDay),
    scope: formatInput(BigInt(scope)),
    user_identifier: formatInput(BigInt(user_identifier)),
    forbidden_countries_list: [...Array(120)].map((x) => '0'),
  };

  return {
    inputs,
    nullifier,
    commitment,
  };
}

export async function prepareAadhaarRegisterData(qrData: string, secret: string, certs: string[]) {
  const sharedData = processQRDataSimple(qrData);
  const delimiterIndices: number[] = [];
  for (let i = 0; i < sharedData.qrDataPadded.length; i++) {
    if (sharedData.qrDataPadded[i] === 255) {
      delimiterIndices.push(i);
    }
    if (delimiterIndices.length === 18) {
      break;
    }
  }
  let photoEOI = 0;
  for (let i = delimiterIndices[17]; i < sharedData.qrDataPadded.length - 1; i++) {
    if (sharedData.qrDataPadded[i + 1] === 217 && sharedData.qrDataPadded[i] === 255) {
      photoEOI = i + 1;
    }
  }
  if (photoEOI === 0) {
    throw new Error('Photo EOI not found');
  }

  const signatureBytes = sharedData.decodedData.slice(
    sharedData.decodedData.length - 256,
    sharedData.decodedData.length
  );
  const signature = BigInt('0x' + bufferToHex(Buffer.from(signatureBytes)).toString());

  //do promise.all for all certs and pick the one that is valid
  const certificates = await Promise.all(
    certs.map(async (cert) => {
      const certificate = forge.pki.certificateFromPem(cert);
      const publicKey = certificate.publicKey as forge.pki.rsa.PublicKey;

      try {
        const md = forge.md.sha256.create();
        md.update(forge.util.binary.raw.encode(sharedData.signedData));

        const isValid = publicKey.verify(md.digest().getBytes(), signatureBytes);
        return isValid;
      } catch (error) {
        return false;
      }
    })
  );

  //find the valid cert
  const validCert = certificates.indexOf(true);
  if (validCert === -1) {
    throw new Error('No valid certificate found');
  }
  const certPem = certs[validCert];
  const cert = forge.pki.certificateFromPem(certPem);
  const modulusHex = (cert.publicKey as forge.pki.rsa.PublicKey).n.toString(16);
  const pubKey = BigInt('0x' + modulusHex);

  const nullifier = nullifierHash(sharedData.extractedFields);
  const packedCommitment = computePackedCommitment(sharedData.extractedFields);
  const commitment = computeCommitment(
    BigInt(secret),
    BigInt(sharedData.qrHash),
    nullifier,
    packedCommitment,
    BigInt(sharedData.photoHash)
  );

  const inputs = {
    qrDataPadded: Uint8ArrayToCharArray(sharedData.qrDataPadded),
    qrDataPaddedLength: sharedData.qrDataPaddedLen,
    delimiterIndices: delimiterIndices,
    signature: splitToWords(signature, BigInt(121), BigInt(17)),
    pubKey: splitToWords(pubKey, BigInt(121), BigInt(17)),
    secret: secret,
    photoEOI: photoEOI,
  };

  return inputs;
}

export function prepareAadhaarRegisterTestData(
  privKeyPem: string,
  pubkeyPem: string,
  secret: string,
  name?: string,
  dateOfBirth?: string,
  gender?: string,
  pincode?: string,
  state?: string,
  timestamp?: string
) {
  const sharedData = processQRData(
    privKeyPem,
    name,
    dateOfBirth,
    gender,
    pincode,
    state,
    timestamp
  );

  const delimiterIndices: number[] = [];
  for (let i = 0; i < sharedData.qrDataPadded.length; i++) {
    if (sharedData.qrDataPadded[i] === 255) {
      delimiterIndices.push(i);
    }
    if (delimiterIndices.length === 18) {
      break;
    }
  }
  let photoEOI = 0;
  for (let i = delimiterIndices[17]; i < sharedData.qrDataPadded.length - 1; i++) {
    if (sharedData.qrDataPadded[i + 1] === 217 && sharedData.qrDataPadded[i] === 255) {
      photoEOI = i + 1;
    }
  }
  if (photoEOI === 0) {
    throw new Error('Photo EOI not found');
  }

  const signatureBytes = sharedData.decodedData.slice(
    sharedData.decodedData.length - 256,
    sharedData.decodedData.length
  );
  const signature = BigInt('0x' + bufferToHex(Buffer.from(signatureBytes)).toString());

  const publicKey = forge.pki.publicKeyFromPem(pubkeyPem);

  const modulusHex = publicKey.n.toString(16);
  const pubKey = BigInt('0x' + modulusHex);

  const nullifier = nullifierHash(sharedData.extractedFields);
  const packedCommitment = computePackedCommitment(sharedData.extractedFields);
  const commitment = computeCommitment(
    BigInt(secret),
    BigInt(sharedData.qrHash),
    nullifier,
    packedCommitment,
    BigInt(sharedData.photoHash)
  );

  const inputs = {
    qrDataPadded: Uint8ArrayToCharArray(sharedData.qrDataPadded),
    qrDataPaddedLength: sharedData.qrDataPaddedLen,
    delimiterIndices: delimiterIndices,
    signature: splitToWords(signature, BigInt(121), BigInt(17)),
    pubKey: splitToWords(pubKey, BigInt(121), BigInt(17)),
    secret: secret,
    photoEOI: photoEOI,
  };

  return {
    inputs,
    nullifier,
    commitment,
  };
}

export function processQRData(
  privKeyPem: string,
  name?: string,
  dateOfBirth?: string,
  gender?: string,
  pincode?: string,
  state?: string,
  timestamp?: string
): SharedQRData {
  const finalName = name ?? 'Sumit Kumar';
  const finalDateOfBirth = dateOfBirth ?? '01-01-1984';
  const finalGender = gender ?? 'M';
  const finalPincode = pincode ?? '110051';
  const finalState = state ?? 'Delhi';

  let QRData: string;
  if (name || dateOfBirth || gender || pincode || state) {
    const newTestData = generateTestData({
      privKeyPem,
      data: testCustomData,
      name: finalName,
      dob: finalDateOfBirth,
      gender: finalGender,
      pincode: finalPincode,
      state: finalState,
      timestamp: timestamp,
    });
    QRData = newTestData.testQRData;
  } else {
    QRData = testQRData.testQRData;
  }

  return processQRDataSimple(QRData);
}

export function processQRDataSimple(qrData: string) {
  const qrDataBytes = convertBigIntToByteArray(BigInt(qrData));
  const decodedData = decompressByteArray(qrDataBytes);
  const signedData = decodedData.slice(0, decodedData.length - 256);
  const [qrDataPaddedNumber, qrDataPaddedLen] = shaPad(signedData, 512 * 3);
  const qrDataPadded = new Uint8Array(qrDataPaddedNumber);
  let photoEOI = 0;
  for (let i = 0; i < qrDataPadded.length - 1; i++) {
    if (qrDataPadded[i + 1] === 217 && qrDataPadded[i] === 255) {
      photoEOI = i + 1;
    }
  }
  if (photoEOI === 0) {
    throw new Error('Photo EOI not found');
  }

  // Extract actual fields from QR data instead of using hardcoded values
  const extractedFields = extractQRDataFields(qrDataBytes);

  // Calculate qrHash exclude timestamp (positions 9-25, 17 bytes)
  // const qrDataWithoutTimestamp = [
  //   ...Array.from(qrDataPadded.slice(0, 9)),
  //   ...Array.from(qrDataPadded.slice(9, 26)).map((x) => 0),
  //   ...Array.from(qrDataPadded.slice(26)),
  // ];
  // const qrHash = packBytesAndPoseidon(qrDataWithoutTimestamp);
  const qrHash = packBytesAndPoseidon(Array.from(qrDataPadded));
  const photo = extractPhoto(Array.from(qrDataPadded), photoEOI + 1);

  const photoHash = packBytesAndPoseidon(photo.bytes.map(Number));

  return {
    qrDataBytes,
    decodedData,
    signedData,
    qrDataPadded,
    qrDataPaddedLen,
    extractedFields,
    qrHash: BigInt(qrHash),
    photo,
    photoHash: BigInt(photoHash),
  };
}
