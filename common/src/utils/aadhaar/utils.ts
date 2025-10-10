import { ethers } from 'ethers';
import forge from 'node-forge';

import { IDENTITY_VERIFICATION_HUB_ADDRESS, RPC_URL } from '../../constants/constants.js';

import {
  convertBigIntToByteArray,
  decompressByteArray,
  extractPhoto,
  getEndIndex,
  getRandomBytes,
  IdFields,
  rawDataToCompressedQR,
  replaceBytesBetween,
  returnFullId,
} from '@anon-aadhaar/core';

export interface ExtractedQRData {
  name: string;
  yob: string;
  mob: string;
  dob: string;
  gender: string;
  pincode: string;
  state: string;
  aadhaarLast4Digits: string;
  phoneNoLast4Digits: string;
  timestamp: string;
}

export const FIELD_POSITIONS = {
  REFERENCE_ID: 2,
  NAME: 3,
  DOB: 4,
  GENDER: 5,
  PINCODE: 11,
  STATE: 13,
  PHONE_NO: 17,
  PHOTO: 18,
} as const;

// Will sign the data with the keys generated for test
const signNewTestData = (newSignedData: Uint8Array, privKeyPem: string) => {
  try {
    // Parse private key from PEM using forge
    const privateKey = forge.pki.privateKeyFromPem(privKeyPem);

    // Create message digest (SHA-256)
    const md = forge.md.sha256.create();
    md.update(forge.util.binary.raw.encode(newSignedData));

    // Sign the hash with the private key
    const signature = privateKey.sign(md);

    // Convert signature to Uint8Array
    const signatureBytes = forge.util.binary.raw.decode(signature);
    return new Uint8Array(signatureBytes);
  } catch (error) {
    console.error('Failed to sign data with forge:', error);
    throw new Error(`Signing failed: ${error}`);
  }
};

export function calculateAge(
  dob: string,
  mob: string,
  yob: string
): { age: number; currentYear: number; currentMonth: number; currentDay: number } {
  const currentDate = new Date();
  const currentYear = currentDate.getUTCFullYear();
  const currentMonth = currentDate.getUTCMonth() + 1; // getMonth() returns 0-11
  const currentDay = currentDate.getUTCDate();

  const birthYear = parseInt(yob);
  const birthMonth = parseInt(mob);
  const birthDay = parseInt(dob);

  let age = currentYear - birthYear;

  if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
    age--;
  }
  return {
    age,
    currentYear,
    currentMonth,
    currentDay,
  };
}

export const createCustomV2TestData = ({
  signedData,
  dob,
  pincode,
  gender,
  state,
  photo,
  name,
  timestamp,
  aadhaarLast4Digits,
}: {
  signedData: Uint8Array;
  dob?: string;
  pincode?: string;
  gender?: string;
  state?: string;
  photo?: boolean;
  name?: string;
  timestamp?: string;
  aadhaarLast4Digits?: string;
}) => {
  const allDataParsed: number[][] = [];
  const delimiterIndices: number[] = [];
  let countDelimiter = 0;
  let temp: number[] = [];
  for (let i = 0; i < signedData.length; i++) {
    if (countDelimiter < 16) {
      if (signedData[i] !== 255) {
        temp.push(signedData[i]);
      } else {
        countDelimiter += 1;
        allDataParsed.push(temp);
        delimiterIndices.push(i);
        temp = [];
      }
    } else {
      break;
    }
  }

  console.log('createCustomV2TestData', {
    signedData,
    dob,
    pincode,
    gender,
    state,
    photo,
    name,
    timestamp,
    aadhaarLast4Digits,
  });

  // Set new timestamp to the time of the signature
  const newDateString = returnNewDateString(timestamp);
  const newTimestamp = new TextEncoder().encode(newDateString);
  const signedDataWithNewTimestamp = replaceBytesBetween(
    signedData,
    newTimestamp,
    6,
    5 + newTimestamp.length
  );

  let modifiedSignedData: Uint8Array = signedDataWithNewTimestamp;

  if (dob) {
    const newDOB = new TextEncoder().encode(dob);
    modifiedSignedData = replaceBytesBetween(
      modifiedSignedData,
      newDOB,
      delimiterIndices[IdFields.DOB - 1] + 1,
      delimiterIndices[IdFields.DOB - 1] + allDataParsed[IdFields.DOB].length
    );
  }

  if (gender) {
    const newGender = new TextEncoder().encode(gender);
    modifiedSignedData = replaceBytesBetween(
      modifiedSignedData,
      newGender,
      delimiterIndices[IdFields.Gender - 1] + 1,
      delimiterIndices[IdFields.Gender - 1] + allDataParsed[IdFields.Gender].length
    );
  }

  if (pincode) {
    const newPincode = new TextEncoder().encode(pincode);
    modifiedSignedData = replaceBytesBetween(
      modifiedSignedData,
      newPincode,
      delimiterIndices[IdFields.PinCode - 1] + 1,
      delimiterIndices[IdFields.PinCode - 1] + allDataParsed[IdFields.PinCode].length
    );
  }

  if (state) {
    const newState = new TextEncoder().encode(state);
    modifiedSignedData = replaceBytesBetween(
      modifiedSignedData,
      newState,
      delimiterIndices[IdFields.State - 1] + 1,
      delimiterIndices[IdFields.State - 1] + allDataParsed[IdFields.State].length
    );
  }

  if (!aadhaarLast4Digits) {
    for (let i = 2; i < 6; i++) {
      modifiedSignedData[i] = Math.floor(Math.random() * 10) + 48;
    }
  }

  if (name) {
    const newName = new TextEncoder().encode(name);
    modifiedSignedData = replaceBytesBetween(
      modifiedSignedData,
      newName,
      delimiterIndices[IdFields.Name - 1] + 1,
      delimiterIndices[IdFields.Name - 1] + allDataParsed[IdFields.Name].length
    );
  }

  if (photo) {
    const { begin, dataLength } = extractPhoto(
      Array.from(modifiedSignedData),
      modifiedSignedData.length
    );
    const photoLength = dataLength - begin;

    modifiedSignedData = replaceBytesBetween(
      modifiedSignedData,
      getRandomBytes(photoLength - 1),
      begin + 1,
      begin + photoLength - 1
    );
  }

  const versionSpecifier = new Uint8Array([86, 50, 255]); // 'V2' in ASCII followed by 255
  const number1234 = new Uint8Array([49, 50, 51, 52, 255]); // '1234' in ASCII followed by 255
  const beforeInsertion = new Uint8Array(
    modifiedSignedData.slice(0, getEndIndex(modifiedSignedData))
  );
  const afterInsertion = new Uint8Array(modifiedSignedData.slice(getEndIndex(modifiedSignedData)));

  // Combine all parts together
  const newData = new Uint8Array(
    versionSpecifier.length + beforeInsertion.length + number1234.length + afterInsertion.length
  );
  newData.set(versionSpecifier, 0);
  newData.set(beforeInsertion, versionSpecifier.length);
  newData.set(number1234, versionSpecifier.length + beforeInsertion.length);
  newData.set(afterInsertion, versionSpecifier.length + beforeInsertion.length + number1234.length);

  return newData;
};

export function extractQRDataFields(qrData: string | Uint8Array): ExtractedQRData {
  let qrDataBytes: Uint8Array;

  if (typeof qrData === 'string') {
    qrDataBytes = convertBigIntToByteArray(BigInt(qrData));
  } else {
    qrDataBytes = qrData;
  }

  const decodedData = decompressByteArray(qrDataBytes);
  const signedData = decodedData.slice(0, decodedData.length - 256);

  const delimiterIndices: number[] = [];
  for (let i = 0; i < signedData.length; i++) {
    if (signedData[i] === 255) {
      delimiterIndices.push(i);
      if (delimiterIndices.length === 18) {
        break;
      }
    }
  }

  if (delimiterIndices.length < 18) {
    throw new Error(`Insufficient delimiters found: ${delimiterIndices.length}/18`);
  }

  const aadhaarLast4Digits = asciiArrayToString([
    signedData[5],
    signedData[6],
    signedData[7],
    signedData[8],
  ]);

  const nameData = extractFieldData(signedData, delimiterIndices, FIELD_POSITIONS.NAME);
  const name = asciiArrayToString(nameData).trim();

  const dobData = extractFieldData(signedData, delimiterIndices, FIELD_POSITIONS.DOB);
  const dob = asciiArrayToString([dobData[0], dobData[1]]); // day
  const mob = asciiArrayToString([dobData[3], dobData[4]]); // month
  const yob = asciiArrayToString([dobData[6], dobData[7], dobData[8], dobData[9]]); // year

  const genderData = extractFieldData(signedData, delimiterIndices, FIELD_POSITIONS.GENDER);
  const gender = asciiArrayToString(genderData);

  // Extract pincode
  const pincodeData = extractFieldData(signedData, delimiterIndices, FIELD_POSITIONS.PINCODE);
  const pincode = asciiArrayToString(pincodeData);

  // Extract state
  const stateData = extractFieldData(signedData, delimiterIndices, FIELD_POSITIONS.STATE);
  const state = asciiArrayToString(stateData).trim();

  // Extract phone number last 4 digits
  const phoneData = extractFieldData(signedData, delimiterIndices, FIELD_POSITIONS.PHONE_NO);
  const phoneNoLast4Digits = asciiArrayToString(phoneData.slice(phoneData.length - 4));

  const timestampYear = asciiArrayToString([
    signedData[9],
    signedData[10],
    signedData[11],
    signedData[12],
  ]);
  const timestampMonth = asciiArrayToString([signedData[13], signedData[14]]);
  const timestampDay = asciiArrayToString([signedData[15], signedData[16]]);
  const timestampHour = asciiArrayToString([signedData[17], signedData[18]]);
  const timestampMinute = asciiArrayToString([signedData[19], signedData[20]]);

  const timestamp = `${timestampYear}-${timestampMonth}-${timestampDay} ${timestampHour}:${timestampMinute}`;

  return {
    name,
    yob,
    mob,
    dob,
    gender,
    pincode,
    state,
    aadhaarLast4Digits,
    phoneNoLast4Digits,
    timestamp,
  };
}

export const generateTestData = ({
  privKeyPem,
  data,
  dob,
  gender,
  pincode,
  state,
  photo,
  name,
  timestamp,
}: {
  privKeyPem: string;
  data: string;
  dob?: string;
  gender?: string;
  pincode?: string;
  state?: string;
  photo?: boolean;
  name?: string;
  timestamp?: string;
}) => {
  const qrDataBytes = convertBigIntToByteArray(BigInt(data));
  const decodedData = decompressByteArray(qrDataBytes);

  // Turning test data V1 into V2
  // Adding the version specifier prefix,
  // the last 4 digits of phone number and timestamp to now
  const dataToSign = createCustomV2TestData({
    signedData: decodedData.slice(0, decodedData.length - 256),
    dob,
    pincode,
    gender,
    state,
    photo,
    name,
    timestamp,
  });

  // Signing the newly generated testData
  const signature = signNewTestData(dataToSign, privKeyPem);

  // Reconstructing the whole QR data
  const tempData = Buffer.concat([dataToSign, signature]);

  // Compressing the data to have it in the same format as the QR code
  const newCompressedData = rawDataToCompressedQR(tempData);
  const newQrData = {
    testQRData: newCompressedData.toString(),
    ...returnFullId(dataToSign),
  };

  return newQrData;
};

export async function getAadharRegistrationWindow() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    const identityVerificationHub = new ethers.Contract(
      IDENTITY_VERIFICATION_HUB_ADDRESS,
      ['function AADHAAR_REGISTRATION_WINDOW() view returns (uint256)'],
      provider
    );

    const aadharRegistrationWindow = await identityVerificationHub.AADHAAR_REGISTRATION_WINDOW();
    return aadharRegistrationWindow;
  } catch (error) {
    console.warn('Failed to get aadhar registration window:', error);
    return 120;
  }
}

export function returnNewDateString(timestamp?: string): string {
  const newDate = timestamp ? new Date(+timestamp) : new Date();

  // Convert the UTC date to IST by adding 5 hours and 30 minutes
  const offsetHours = 5;
  const offsetMinutes = 30;
  newDate.setUTCHours(newDate.getUTCHours() + offsetHours);
  newDate.setUTCMinutes(newDate.getUTCMinutes() + offsetMinutes);

  return (
    newDate.getUTCFullYear().toString() +
    (newDate.getUTCMonth() + 1).toString().padStart(2, '0') +
    newDate.getUTCDate().toString().padStart(2, '0') +
    newDate.getUTCHours().toString().padStart(2, '0') +
    newDate.getUTCMinutes().toString().padStart(2, '0') +
    newDate.getUTCSeconds().toString().padStart(2, '0') +
    newDate.getUTCMilliseconds().toString().padStart(3, '0')
  );
}

function asciiArrayToString(asciiArray: number[]): string {
  return asciiArray
    .filter((byte) => byte !== 0)
    .map((byte) => String.fromCharCode(byte))
    .join('');
}

function extractFieldData(
  data: Uint8Array,
  delimiterIndices: number[],
  position: number
): number[] {
  const startIndex = delimiterIndices[position - 1] + 1;
  const endIndex = delimiterIndices[position];

  const fieldData: number[] = [];
  for (let i = startIndex; i < endIndex; i++) {
    fieldData.push(data[i]);
  }

  return fieldData;
}

// This is the official test data issued by the UIDAI
// In this script we'll change the signed data to emulate the specs of the Aadhaar QR V2
// and sign the data again with our own certificates.
// data on https://uidai.gov.in/en/ecosystem/authentication-devices-documents/qr-code-reader.html
// This data is copied from https://github.dev/anon-aadhaar/anon-aadhaar/blob/main/packages/circuits/src/helpers/extractor.circom
export function stringToAsciiArray(str: string) {
  return str.split('').map((char) => char.charCodeAt(0));
}

// This modify the test data to make it compliant with the secure Aadhaar QR V2 2022
// - Adds the version specifier at the beginning 'V2'
// - Mocks last 4 digits of phone number '1234' after VTC
// - Refresh timestamp data to now
// - Optionally it can take parameters to change the test data fields (dob, pinCode, gender, state)
export const testCustomData =
  '2374971804270526477833002468783965837992554564899874087591661303561346432389832047870524302186901344489362368642972767716416349990805756094923115719687656090691368051627957878187788907419297818953295185555346288172578594637886352753543271000481717080003254556962148594350559820352806251787713278744047402230989238559317351232114240089849934148895256488140236015024800731753594740948640957680138566468247224859669467819596919398964809164399637893729212452791889199675715949918925838319591794702333094022248132120531152523331442741730158840977243402215102904932650832502847295644794421419704633765033761284508863534321317394686768650111457751139630853448637215423705157211510636160227953566227527799608082928846103264491539001327407775670834868948113753614112563650255058316849200536533335903554984254814901522086937767458409075617572843449110393213525925388131214952874629655799772119820372255291052673056372346072235458198199995637720424196884145247220163810790179386390283738429482893152518286247124911446073389185062482901364671389605727763080854673156754021728522287806275420847159574631844674460263574901590412679291518508010087116598357407343835408554094619585212373168435612645646129147973594416508676872819776522537778717985070402222824965034768103900739105784663244748432502180989441389718131079445941981681118258324511923246198334046020123727749408128519721102477302359413240175102907322619462289965085963377744024233678337951462006962521823224880199210318367946130004264196899778609815012001799773327514133268825910089483612283510244566484854597156100473055413090101948456959122378865704840756793122956663218517626099291311352417342899623681483097817511136427210593032393600010728324905512596767095096153856032112835755780472808814199620390836980020899858288860556611564167406292139646289142056168261133256777093245980048335918156712295254776487472431445495668303900536289283098315798552328294391152828182614909451410115516297083658174657554955228963550255866282688308751041517464999930825273776417639569977754844191402927594739069037851707477839207593911886893016618794870530622356073909077832279869798641545167528509966656120623184120128052588408742941658045827255866966100249857968956536613250770326334844204927432961924987891433020671754710428050564671868464658436926086493709176888821257183419013229795869757265111599482263223604228286513011751601176504567030118257385997460972803240338899836840030438830725520798480181575861397469056536579877274090338750406459700907704031830137890544492015701251066934352867527112361743047684237105216779177819594030160887368311805926405114938744235859610328064947158936962470654636736991567663705830950312548447653861922078087824048793236971354828540758657075837209006713701763902429652486225300535997260665898927924843608750347193892239342462507130025307878412116604096773706728162016134101751551184021079984480254041743057914746472840768175369369852937574401874295943063507273467384747124843744395375119899278823903202010381949145094804675442110869084589592876721655764753871572233276245590041302887094585204427900634246823674277680009401177473636685542700515621164233992970974893989913447733956146698563285998205950467321954304';
