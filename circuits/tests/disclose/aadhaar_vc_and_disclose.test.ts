// eslint-disable-next-line @typescript-eslint/no-var-requires
const circom_tester = require('circom_tester/wasm/tester')

import fs from 'fs'
import crypto from 'crypto'
import path from 'path'
import dotenv from 'dotenv';
import { describe } from 'mocha';
import { assert, expect } from 'chai';

import { sha256Pad } from '@zk-email/helpers/dist/sha-utils'
import {
  bigIntToChunkedBytes,
  bufferToHex,
  Uint8ArrayToCharArray,
} from '@zk-email/helpers/dist/binary-format'

import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { SMT } from '@openpassport/zk-kit-smt';

import {
  convertBigIntToByteArray,
  decompressByteArray,
  splitToWords,
  extractPhoto,
  timestampToUTCUnix,
} from '@anon-aadhaar/core'
import {
  AADHAAR_ATTESTATION_ID,
} from '../../../common/src/constants/constants';
import { generateCommitment } from '../../../common/src/utils/passports/passport';
import { buildPoseidon } from 'circomlibjs'
import { testQRData } from '../../../common/tests/aadhaar/dataInput.json'
import { bytesToIntChunks, padArrayWithZeros, bigIntsToString } from '../aadhaar/utils'
import { poseidon1, poseidon2 } from 'poseidon-lite';

import nameAndDobjson from '../../../common/ofacdata/outputs/nameAndDobSMT.json';
import nameAndYobjson from '../../../common/ofacdata/outputs/nameAndYobSMT.json';
import passportNojson from '../../../common/ofacdata/outputs/passportNoAndNationalitySMT.json';

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

function prepareTestData() {
  const qrDataBytes = convertBigIntToByteArray(BigInt(QRData))
  const decodedData = decompressByteArray(qrDataBytes)

  const signatureBytes = decodedData.slice(
    decodedData.length - 256,
    decodedData.length,
  )

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
    path.join(__dirname, '../../../common/aadhaar', getCertificate(testAadhaar)),
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
  }
}


describe('Disclose_aadhaar', function () {
  this.timeout(0);
  let inputs: any;
  let circuit: any;
  let w: any;


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

  const passportNo_smt = new SMT(poseidon2, true);
  passportNo_smt.import(passportNojson);

  const nameAndDob_smt = new SMT(poseidon2, true);
  nameAndDob_smt.import(nameAndDobjson);

  const nameAndYob_smt = new SMT(poseidon2, true);
  nameAndYob_smt.import(nameAndYobjson);

  const selector_ofac = 1;

  before(async () => {
    circuit = await circom_tester(
      path.join(__dirname, '../../circuits/disclose/vc_and_disclose.circom'),
      {
        include: [
          'node_modules',
          './node_modules/@zk-kit/binary-merkle-root.circom/src',
          './node_modules/circomlib/circuits',
        ],
      }
    );

    
  });

  it('should compile and load the circuit', async function () {
    const { inputs } = prepareTestData()
    await circuit.calculateWitness(inputs)
  });

  // it('should have nullifier == poseidon(secret, scope)', async function () {
  //   w = await circuit.calculateWitness(inputs);
  //   const nullifier_js = poseidon2([inputs.secret, inputs.scope]).toString();
  //   const nullifier_circom = (await circuit.getOutput(w, ['nullifier'])).nullifier;

  //   console.log('nullifier_circom', nullifier_circom);
  //   console.log('nullifier_js', nullifier_js);
  //   expect(nullifier_circom).to.equal(nullifier_js);
  // });

  // it('should fail to calculate witness with different attestation_id', async function () {
  //   try {
  //     const invalidInputs = {
  //       ...inputs,
  //       attestation_id: poseidon1([
  //         BigInt(Buffer.from('ANON-AADHAAR').readUIntBE(0, 6)),
  //       ]).toString(),
  //     };
  //     await circuit.calculateWitness(invalidInputs);
  //     expect.fail('Expected an error but none was thrown.');
  //   } catch (error) {
  //     // expect(error.message).to.include('Assert Failed');
  //   }
  // });

  describe('selective disclosure', function () {


  });

  // it('should allow disclosing majority', async function () {
  //   const selector_dg1 = Array(88).fill('0');

  //   w = await circuit.calculateWitness({
  //     ...inputs,
  //     selector_dg1: selector_dg1.map(String),
  //   });
  //   const revealedData_packed = await circuit.getOutput(w, ['revealedData_packed[3]']);

  //   const reveal_unpacked = formatAndUnpackReveal(revealedData_packed);
  //   const older_than = getAttributeFromUnpackedReveal(reveal_unpacked, 'older_than');
  //   expect(older_than).to.equal('18');
  // });

  // it("shouldn't allow disclosing wrong majority", async function () {
  //   const selector_dg1 = Array(88).fill('0');

  //   w = await circuit.calculateWitness({
  //     ...inputs,
  //     majority: ['5', '0'].map((char) => BigInt(char.charCodeAt(0)).toString()),
  //     selector_dg1: selector_dg1.map(String),
  //   });

  //   const revealedData_packed = await circuit.getOutput(w, ['revealedData_packed[3]']);

  //   const reveal_unpacked = formatAndUnpackReveal(revealedData_packed);
  //   expect(reveal_unpacked[88]).to.equal('\x00');
  //   expect(reveal_unpacked[89]).to.equal('\x00');
  // });

  // describe('OFAC disclosure', function () {
  //   it('should allow disclosing OFAC check result when selector is 1', async function () {
  //     w = await circuit.calculateWitness(inputs);

  //     const revealedData_packed = await circuit.getOutput(w, ['revealedData_packed[3]']);
  //     const reveal_unpacked = formatAndUnpackReveal(revealedData_packed);

  //     console.log('reveal_unpacked', reveal_unpacked);
  //     // OFAC result is stored at index 90 in the revealed data
  //     const ofac_results = reveal_unpacked.slice(90, 93);

  //     console.log('ofac_results', ofac_results);

  //     expect(ofac_results).to.deep.equal(
  //       ['\x01', '\x01', '\x01'],
  //       'OFAC result bits should be [1, 1, 1]'
  //     );
  //     expect(ofac_results).to.not.equal(['\x00', '\x00', '\x00'], 'OFAC result should be revealed');
  //   });

    // it('should not disclose OFAC check result when selector is 0', async function () {
    //   w = await circuit.calculateWitness({
    //     ...inputs,
    //     selector_ofac: '0',
    //   });

    //   const revealedData_packed = await circuit.getOutput(w, ['revealedData_packed[3]']);
    //   const reveal_unpacked = formatAndUnpackReveal(revealedData_packed);

    //   // OFAC result should be hidden (null byte)
    //   const ofac_result = reveal_unpacked[90];
    //   expect(ofac_result).to.equal('\x00', 'OFAC result should not be revealed');
    // });


  });

