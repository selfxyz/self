import { expect } from 'chai';
import path from 'path';
import { wasm as wasm_tester } from 'circom_tester';
import { testQRData } from '../../../common/src/utils/aadhaar/assets/dataInput.js';
import { sha256Pad } from '@zk-email/helpers/dist/sha-utils.js';
import { Uint8ArrayToCharArray } from '@zk-email/helpers/dist/binary-format.js';
import { convertBigIntToByteArray, decompressByteArray } from '@anon-aadhaar/core';
import { assert } from 'chai';
import { testCustomData } from '../utils/aadhaar/generateTestData.js';
import { generateTestData } from '@selfxyz/common';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const privateKeyPem = fs.readFileSync(
  path.join(__dirname, '../../node_modules/anon-aadhaar-circuits/assets/testPrivateKey.pem'),
  'utf8'
);

describe('Aadhaar QR Data Extractor1', function () {
  let circuit: any;
  this.beforeAll(async function () {
    this.timeout(0);
    circuit = await wasm_tester(
      path.join(__dirname, '../../circuits/tests/utils/extractQrData_tester.circom'),
      {
        verbose: true,
        logOutput: true,
        include: [
          'node_modules',
          'node_modules/anon-aadhaar-circuits/src/helpers/constants.circom',
          'node_modules/circomlib/circuits',
        ],
      }
    );
  });

  it('should compile and load the circuit', async function () {
    this.timeout(0);
    expect(circuit).to.not.be.undefined;
  });

  it('should extract qr data', async function () {
    this.timeout(0);
    const QRDataBytes = convertBigIntToByteArray(BigInt(testQRData.testQRData));
    const QRDataDecode = decompressByteArray(QRDataBytes);

    const signedData = QRDataDecode.slice(0, QRDataDecode.length - 256);

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
    let photoEOI = 0;
    for (let i = delimiterIndices[17]; i < qrDataPadded.length - 1; i++) {
      if (qrDataPadded[i + 1] === 217 && qrDataPadded[i] === 255) {
        photoEOI = i + 1;
      }
    }
    if (photoEOI === 0) {
      throw new Error('Photo EOI not found');
    }

    const witness: any[] = await circuit.calculateWitness({
      data: Uint8ArrayToCharArray(qrDataPadded),
      qrDataPaddedLength: qrDataPaddedLen,
      delimiterIndices: delimiterIndices,
      photoEOI: photoEOI,
    });

    const out = await circuit.getOutput(witness, [
      'name[62]',
      'yob[4]',
      'mob[2]',
      'dob[2]',
      'gender',
      'pincode[6]',
      'state[31]',
      'aadhaar_last_4digits[4]',
      'ph_no_last_4digits[4]',
      'timestamp',
    ]);

    await circuit.checkConstraints(witness);

    const paddedName = 'Sumit Kumar'
      .padEnd(62, '\0')
      .split('')
      .map((char) => char.charCodeAt(0));

    for (let i = 0; i < 62; i++) {
      assert(Number(out[`name[${i}]`]) === paddedName[i], `Name mismatch at index ${i}`);
    }

    const yearAscii = '1984'.split('').map((char) => char.charCodeAt(0));
    for (let i = 0; i < 4; i++) {
      assert(Number(out[`yob[${i}]`]) === yearAscii[i], `YOB mismatch at index ${i}`);
    }

    const monthAscii = '01'.split('').map((char) => char.charCodeAt(0));
    for (let i = 0; i < 2; i++) {
      assert(Number(out[`mob[${i}]`]) === monthAscii[i], `MOB mismatch at index ${i}`);
    }

    const dayAscii = '01'.split('').map((char) => char.charCodeAt(0));
    for (let i = 0; i < 2; i++) {
      assert(Number(out[`dob[${i}]`]) === dayAscii[i], `DOB mismatch at index ${i}`);
    }

    assert(Number(out.gender) === 77);

    const pincodeAscii = '110051'.split('').map((char) => char.charCodeAt(0));
    for (let i = 0; i < 6; i++) {
      assert(Number(out[`pincode[${i}]`]) === pincodeAscii[i], `PINCODE mismatch at index ${i}`);
    }

    const aadhaarLast4DigitsAscii = '2697'.split('').map((char) => char.charCodeAt(0));
    for (let i = 0; i < 4; i++) {
      assert(
        Number(out[`aadhaar_last_4digits[${i}]`]) === aadhaarLast4DigitsAscii[i],
        `AADHAAR mismatch at index ${i}`
      );
    }

    const phNoLast4DigitsAscii = '1234'.split('').map((char) => char.charCodeAt(0));
    for (let i = 0; i < 4; i++) {
      assert(
        Number(out[`ph_no_last_4digits[${i}]`]) === phNoLast4DigitsAscii[i],
        `PHONE mismatch at index ${i}`
      );
    }

    for (let i = 0; i < 31; i++) {
      assert(
        Number(out[`state[${i}]`]) ===
          'Delhi'
            .padEnd(31, '\0')
            .split('')
            .map((char) => char.charCodeAt(0))[i],
        `STATE mismatch at index ${i}`
      );
    }
  });

  it('should extract qr data from the new test data', async function () {
    this.timeout(0);
    const newTestData = generateTestData({
      privKeyPem: privateKeyPem,
      data: testCustomData,
      gender: 'F',
      dob: '15-12-2012',
      pincode: '554587',
      state: 'Karnataka',
      name: 'KL RAHUL',
    });
    const QRDataBytes = convertBigIntToByteArray(BigInt(newTestData.testQRData));
    const QRDataDecode = decompressByteArray(QRDataBytes);

    const signedData = QRDataDecode.slice(0, QRDataDecode.length - 256);
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

    let photoEOI = 0;
    for (let i = delimiterIndices[17]; i < qrDataPadded.length - 1; i++) {
      if (qrDataPadded[i + 1] === 217 && qrDataPadded[i] === 255) {
        photoEOI = i + 1;
      }
    }
    if (photoEOI === 0) {
      throw new Error('Photo EOI not found');
    }

    const witness: any[] = await circuit.calculateWitness({
      data: Uint8ArrayToCharArray(qrDataPadded),
      qrDataPaddedLength: qrDataPaddedLen,
      delimiterIndices: delimiterIndices,
      photoEOI: photoEOI,
    });

    const out = await circuit.getOutput(witness, [
      'name[62]',
      'yob[4]',
      'mob[2]',
      'dob[2]',
      'gender',
      'pincode[6]',
      'state[31]',
      'aadhaar_last_4digits[4]',
      'ph_no_last_4digits[4]',
      'timestamp',
    ]);

    await circuit.checkConstraints(witness);

    const nameAscii = 'KL RAHUL'
      .padEnd(62, '\0')
      .split('')
      .map((char) => char.charCodeAt(0));
    for (let i = 0; i < 62; i++) {
      assert(Number(out[`name[${i}]`]) === nameAscii[i], `NAME mismatch at index ${i}`);
    }

    const yearAscii = '2012'.split('').map((char) => char.charCodeAt(0));
    for (let i = 0; i < 4; i++) {
      assert(Number(out[`yob[${i}]`]) === yearAscii[i], `YOB mismatch at index ${i}`);
    }

    const monthAscii = '12'.split('').map((char) => char.charCodeAt(0));
    for (let i = 0; i < 2; i++) {
      assert(Number(out[`mob[${i}]`]) === monthAscii[i], `MOB mismatch at index ${i}`);
    }

    const dayAscii = '15'.split('').map((char) => char.charCodeAt(0));
    for (let i = 0; i < 2; i++) {
      assert(Number(out[`dob[${i}]`]) === dayAscii[i], `DOB mismatch at index ${i}`);
    }

    assert(Number(out.gender) === 70);

    const pincodeAscii = '554587'.split('').map((char) => char.charCodeAt(0));
    for (let i = 0; i < 6; i++) {
      assert(Number(out[`pincode[${i}]`]) === pincodeAscii[i], `PINCODE mismatch at index ${i}`);
    }

    for (let i = 0; i < 31; i++) {
      assert(
        Number(out[`state[${i}]`]) ===
          'Karnataka'
            .padEnd(31, '\0')
            .split('')
            .map((char) => char.charCodeAt(0))[i],
        `STATE mismatch at index ${i}`
      );
    }
  });
});
