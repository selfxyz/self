import { expect } from 'chai';
import { wasm as wasmTester } from 'circom_tester';
import path from 'path';
import assert from 'assert';
import { SMT } from '@openpassport/zk-kit-smt';
import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { poseidon2 } from 'poseidon-lite';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { genMockIdDoc } from '@selfxyz/new-common/src/testing/genMockIdDoc.js';
import { generateTestData, testCustomData } from '@selfxyz/new-common/src/testing/genMockAadhaarData.js';
import { AADHAAR_MOCK_PRIVATE_KEY_PEM, AADHAAR_MOCK_PUBLIC_KEY_PEM } from '@selfxyz/new-common/src/testing/mockAadhaarCert.js';
import { processQRData, extractSignatureBytes } from '@selfxyz/new-common/src/documents/aadhaar/qr.js';
import { AadhaarDocument } from '@selfxyz/new-common/src/documents/aadhaar/adapter.js';
import { createCircuitInputGenerator } from '@selfxyz/new-common/src/circuits/generator.js';
import { extractField } from '@selfxyz/new-common/src/documents/aadhaar/constants.js';
import { unpackReveal } from '@selfxyz/new-common/src/circuits/outputs/format.js';
import type { AadhaarData } from '@selfxyz/new-common/src/foundation/types/document.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const generator = createCircuitInputGenerator();

const nameAndDobAadhaarjson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../consts/ofac/nameAndDobAadhaarSMT.json'), 'utf8')
);
const nameAndYobAadhaarjson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../consts/ofac/nameAndYobAadhaarSMT.json'), 'utf8')
);

const nameAndDob_smt = new SMT(poseidon2, true);
nameAndDob_smt.import(nameAndDobAadhaarjson as any);

const nameAndYob_smt = new SMT(poseidon2, true);
nameAndYob_smt.import(nameAndYobAadhaarjson as any);

const tree: any = new LeanIMT((a, b) => poseidon2([a, b]), []);

function createAadhaarDoc(opts?: {
  name?: string;
  dateOfBirth?: string;
  gender?: string;
  pincode?: string;
  state?: string;
  timestamp?: string;
}): AadhaarDocument {
  if (opts?.name || opts?.dateOfBirth || opts?.gender || opts?.pincode || opts?.state || opts?.timestamp) {
    const generated = generateTestData({
      privKeyPem: AADHAAR_MOCK_PRIVATE_KEY_PEM,
      data: testCustomData,
      name: opts?.name,
      dob: opts?.dateOfBirth,
      gender: opts?.gender,
      pincode: opts?.pincode,
      state: opts?.state,
      timestamp: opts?.timestamp,
    });
    const processed = processQRData(generated.testQRData);
    const signatureBytes = extractSignatureBytes(processed.decodedData);
    const data: AadhaarData = {
      documentType: 'mock_aadhaar',
      documentCategory: 'aadhaar',
      mock: true,
      qrData: generated.testQRData,
      extractedFields: processed.extractedFields,
      signature: Array.from(signatureBytes),
      publicKey: AADHAAR_MOCK_PUBLIC_KEY_PEM,
      photoHash: processed.photoHash.toString(),
    };
    return new AadhaarDocument(data);
  }

  const data = genMockIdDoc({ idType: 'mock_aadhaar' });
  return new AadhaarDocument(data);
}

function getPackedRevealData(revealedData: any): string[] {
  return [
    revealedData['revealData_packed[0]'],
    revealedData['revealData_packed[1]'],
    revealedData['revealData_packed[2]'],
    revealedData['revealData_packed[3]'],
  ];
}

describe(' VC and Disclose Aadhaar Circuit Tests', function () {
  let circuit: any;
  this.beforeAll(async function () {
    this.timeout(0);
    circuit = await wasmTester(
      path.join(__dirname, '../../circuits/disclose/vc_and_disclose_aadhaar.circom'),
      {
        verbose: true,
        logOutput: true,
        include: ['node_modules', 'node_modules/circomlib/circuits'],
      }
    );
  });

  it('should compile and load the circuit', async function () {
    this.timeout(0);
    expect(circuit).to.not.be.undefined;
  });

  it('should calculate witness and pass constrain check', async function () {
    this.timeout(0);
    const doc = createAadhaarDoc();
    const inputs = generator.generateDiscloseInputs(doc, '1234', {
      merkletree: tree,
      nameAndDob_smt,
      nameAndYob_smt,
      scope: '333',
      fieldsToReveal: [],
      user_identifier: '0',
      minimumAge: 0,
      updateTree: true,
    });
    const w = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(w);
  });

  it('should reveal gender only', async function () {
    this.timeout(0);
    const doc = createAadhaarDoc();
    const inputs = generator.generateDiscloseInputs(doc, '1234', {
      merkletree: tree,
      nameAndDob_smt,
      nameAndYob_smt,
      scope: '333',
      fieldsToReveal: ['gender'],
      user_identifier: '0',
      minimumAge: 0,
      updateTree: true,
    });

    const w = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(w);

    const revealedData = await circuit.getOutput(w, [`revealData_packed[4]`]);

    const revealedData_packed = getPackedRevealData(revealedData);
    const revealedDataUnpacked = unpackReveal(revealedData_packed);

    const gender = extractField(revealedDataUnpacked, 'GENDER');
    const minimumAge = extractField(revealedDataUnpacked, 'MINIMUM_AGE_VALID');

    assert(gender === 'M', 'Gender should be Male');
    assert(minimumAge.toString() === (inputs as any).minimumAge[0], 'Minimum Age should be 0');
  });

  it('should reveal yob, mob, dob, reveal_ofac_name_yob only', async function () {
    this.timeout(0);
    const doc = createAadhaarDoc();
    const inputs = generator.generateDiscloseInputs(doc, '1234', {
      merkletree: tree,
      nameAndDob_smt,
      nameAndYob_smt,
      scope: '333',
      fieldsToReveal: ['date_of_birth', 'ofac'],
      user_identifier: '0',
      minimumAge: 0,
      updateTree: true,
    });

    const w = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(w);

    const revealedData = await circuit.getOutput(w, [`revealData_packed[4]`, 'reveal_photoHash']);

    const revealedData_packed = getPackedRevealData(revealedData);
    const revealedDataUnpacked = unpackReveal(revealedData_packed);

    const yearOfBirth = extractField(revealedDataUnpacked, 'YEAR_OF_BIRTH');
    const monthOfBirth = extractField(revealedDataUnpacked, 'MONTH_OF_BIRTH');
    const dayOfBirth = extractField(revealedDataUnpacked, 'DAY_OF_BIRTH');
    const ofacNameYobCheck = extractField(revealedDataUnpacked, 'OFAC_NAME_YOB_CHECK');
    const minimumAge = extractField(revealedDataUnpacked, 'MINIMUM_AGE_VALID');

    assert(yearOfBirth === '1984', 'YOB should be 1984');
    assert(monthOfBirth === '01', 'MOB should be 01');
    assert(dayOfBirth === '01', 'DOB should be 01');
    assert(ofacNameYobCheck === 1, 'OFAC Name YOB should be 1 (not in OFAC list)');

    for (let i = 9; i < 116; i++) {
      assert(revealedDataUnpacked[i] === '\0', `Output ${i} should be null character`);
    }

    assert(revealedData.reveal_photoHash === '0', 'Photo Hash should be 0');
    assert(minimumAge.toString() === (inputs as any).minimumAge[0], 'Minimum Age should be 0');
  });

  it('ofac_check_result should be 0 if exists in ofac_name_dob_smt and ofac_name_yob_smt', async function () {
    this.timeout(0);
    const doc = createAadhaarDoc({
      name: 'Abu ABBAS',
      dateOfBirth: '10-12-1948',
    });
    const inputs = generator.generateDiscloseInputs(doc, '1234', {
      merkletree: tree,
      nameAndDob_smt,
      nameAndYob_smt,
      scope: '333',
      fieldsToReveal: ['ofac'],
      user_identifier: '0',
      minimumAge: 100,
      updateTree: true,
    });

    const w = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(w);

    const revealedData = await circuit.getOutput(w, [`revealData_packed[4]`]);

    const revealedData_packed = getPackedRevealData(revealedData);
    const revealedDataUnpacked = unpackReveal(revealedData_packed);

    const ofacNameDobCheck = extractField(revealedDataUnpacked, 'OFAC_NAME_DOB_CHECK');
    const ofacNameYobCheck = extractField(revealedDataUnpacked, 'OFAC_NAME_YOB_CHECK');
    const minimumAge = extractField(revealedDataUnpacked, 'MINIMUM_AGE_VALID');

    for (let i = 0; i < 115; i++) {
      assert(revealedDataUnpacked[i] === '\0', `Output ${i} should be null character`);
    }

    assert(ofacNameYobCheck === 0, 'OFAC Name YOB should be 0 (in OFAC list)');
    assert(ofacNameDobCheck === 0, 'OFAC Name DOB should be 0 (in OFAC list)');
    assert(minimumAge.toString() === '0', 'Minimum Age should be 0');
  });

  it('ofac_check_result should be 0 if exists in ofac_name_dob_reverse_smt and ofac_name_yob_reverse_smt', async function () {
    this.timeout(0);
    const doc = createAadhaarDoc({
      name: 'ABBAS ABU',
      dateOfBirth: '10-12-1948',
    });
    const inputs = generator.generateDiscloseInputs(doc, '1234', {
      merkletree: tree,
      nameAndDob_smt,
      nameAndYob_smt,
      scope: '333',
      fieldsToReveal: ['ofac'],
      user_identifier: '0',
      minimumAge: 100,
      updateTree: true,
    });

    const w = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(w);

    const revealedData = await circuit.getOutput(w, [`revealData_packed[4]`]);

    const revealedData_packed = getPackedRevealData(revealedData);
    const revealedDataUnpacked = unpackReveal(revealedData_packed);

    const ofacNameDobCheck = extractField(revealedDataUnpacked, 'OFAC_NAME_DOB_CHECK');
    const ofacNameYobCheck = extractField(revealedDataUnpacked, 'OFAC_NAME_YOB_CHECK');
    const minimumAge = extractField(revealedDataUnpacked, 'MINIMUM_AGE_VALID');

    for (let i = 0; i < 115; i++) {
      assert(revealedDataUnpacked[i] === '\0', `Output ${i} should be null character`);
    }

    assert(ofacNameYobCheck === 0, 'OFAC Name YOB should be 0 (in OFAC list)');
    assert(ofacNameDobCheck === 0, 'OFAC Name DOB should be 0 (in OFAC list)');
    assert(minimumAge.toString() === '0', 'Minimum Age should be 0');
  });
});
