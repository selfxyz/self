import { expect } from 'chai';
import { wasm as wasmTester } from 'circom_tester';
import path from 'path';

import assert from 'assert';
import { formatInput } from '@selfxyz/common/utils/circuits/generateInputs';
import { unpackReveal } from '@selfxyz/common/utils/circuits/formatOutputs';
import { fileURLToPath } from 'url';
import { createSelector, extractField } from '@selfxyz/common/utils/aadhaar/constants';
import { prepareAadhaarDiscloseTestData } from '@selfxyz/common';
import { SMT } from '@openpassport/zk-kit-smt';
import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { poseidon2 } from 'poseidon-lite';
import nameAndDobAadhaarjson from '../consts/ofac/nameAndDobAadhaarSMT.json' with { type: 'json' };
import nameAndYobAadhaarjson from '../consts/ofac/nameAndYobAadhaarSMT.json' with { type: 'json' };

import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Dynamically resolve the anon-aadhaar-circuits package location
function resolvePackagePath(packageName: string, subpath: string): string {
  try {
    // Try to resolve the package's package.json
    const packageJsonPath = require.resolve(`${packageName}/package.json`, {
      paths: [__dirname],
    });
    const packageDir = path.dirname(packageJsonPath);
    return path.join(packageDir, subpath);
  } catch (error) {
    // Fallback to traditional node_modules search
    const modulePath = path.join(__dirname, '../../node_modules', packageName, subpath);
    if (fs.existsSync(modulePath)) {
      return modulePath;
    }
    throw new Error(`Could not resolve ${packageName}/${subpath}`);
  }
}

const privateKeyPem = fs.readFileSync(
  resolvePackagePath('anon-aadhaar-circuits', 'assets/testPrivateKey.pem'),
  'utf8'
);

// Create SMTs at module level
const nameAndDob_smt = new SMT(poseidon2, true);
nameAndDob_smt.import(nameAndDobAadhaarjson as any);

const nameAndYob_smt = new SMT(poseidon2, true);
nameAndYob_smt.import(nameAndYobAadhaarjson as any);

// Create Merkle tree at module level
const tree: any = new LeanIMT((a, b) => poseidon2([a, b]), []);

// Helper function to get packed reveal data from circuit output
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
    const { inputs } = prepareAadhaarDiscloseTestData(
      privateKeyPem,
      tree,
      nameAndDob_smt,
      nameAndYob_smt,
      '333',
      '1234',
      '585225',
      '0',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      true
    );
    const w = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(w);
  });

  it('should reveal gender only', async function () {
    this.timeout(0);
    const { inputs } = prepareAadhaarDiscloseTestData(
      privateKeyPem,
      tree,
      nameAndDob_smt,
      nameAndYob_smt,
      '333',
      '1234',
      '585225',
      '0',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      true
    );

    // Use createSelector to generate selector for revealing only gender
    const selector = createSelector(['GENDER']);
    inputs.selector = formatInput(selector)[0];

    const w = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(w);

    const revealedData = await circuit.getOutput(w, [`revealData_packed[4]`]);

    const revealedData_packed = getPackedRevealData(revealedData);
    const revealedDataUnpacked = unpackReveal(revealedData_packed, 'id');

    // Use extractField to get field values
    const gender = extractField(revealedDataUnpacked, 'GENDER');
    const minimumAge = extractField(revealedDataUnpacked, 'MINIMUM_AGE_VALID');

    assert(gender === 'M', 'Gender should be Male');
    assert(minimumAge.toString() === inputs.minimumAge[0], 'Minimum Age should be 0');
  });

  it('should reveal yob, mob, dob, reveal_ofac_name_yob only', async function () {
    this.timeout(0);
    const { inputs } = prepareAadhaarDiscloseTestData(
      privateKeyPem,
      tree,
      nameAndDob_smt,
      nameAndYob_smt,
      '333',
      '1234',
      '585225',
      '0',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      true
    );

    // Use createSelector to generate selector for revealing birth date and OFAC check
    const selector = createSelector([
      'YEAR_OF_BIRTH',
      'MONTH_OF_BIRTH',
      'DAY_OF_BIRTH',
      'OFAC_NAME_YOB_CHECK',
    ]);
    inputs.selector = formatInput(selector)[0];

    const w = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(w);

    const revealedData = await circuit.getOutput(w, [`revealData_packed[4]`, 'reveal_photoHash']);

    const revealedData_packed = getPackedRevealData(revealedData);
    const revealedDataUnpacked = unpackReveal(revealedData_packed, 'id');

    // Use extractField to get field values
    const yearOfBirth = extractField(revealedDataUnpacked, 'YEAR_OF_BIRTH');
    const monthOfBirth = extractField(revealedDataUnpacked, 'MONTH_OF_BIRTH');
    const dayOfBirth = extractField(revealedDataUnpacked, 'DAY_OF_BIRTH');
    const ofacNameYobCheck = extractField(revealedDataUnpacked, 'OFAC_NAME_YOB_CHECK');
    const minimumAge = extractField(revealedDataUnpacked, 'MINIMUM_AGE_VALID');

    // Verify extracted values
    assert(yearOfBirth === '1984', 'YOB should be 1984');
    assert(monthOfBirth === '01', 'MOB should be 01');
    assert(dayOfBirth === '01', 'DOB should be 01');
    assert(ofacNameYobCheck === 1, 'OFAC Name YOB should be 1 (not in OFAC list)');

    // Verify non-revealed fields are null
    for (let i = 9; i < 116; i++) {
      assert(revealedDataUnpacked[i] === '\0', `Output ${i} should be null character`);
    }

    assert(revealedData.reveal_photoHash === '0', 'Photo Hash should be 0');
    assert(minimumAge.toString() === inputs.minimumAge[0], 'Minimum Age should be 0');
  });

  it('ofac_check_result should be 0 if exists in ofac_name_dob_smt and ofac_name_yob_smt', async function () {
    this.timeout(0);
    const { inputs } = prepareAadhaarDiscloseTestData(
      privateKeyPem,
      tree,
      nameAndDob_smt,
      nameAndYob_smt,
      '333',
      '1234',
      '585225',
      '0',
      'Abu ABBAS',
      '10-12-1948',
      undefined,
      undefined,
      undefined,
      undefined,
      true
    );

    // Use createSelector to generate selector for revealing OFAC checks
    const selector = createSelector(['OFAC_NAME_DOB_CHECK', 'OFAC_NAME_YOB_CHECK']);
    inputs.selector = formatInput(selector)[0];
    inputs.minimumAge = ['100'];

    const w = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(w);

    const revealedData = await circuit.getOutput(w, [`revealData_packed[4]`]);

    const revealedData_packed = getPackedRevealData(revealedData);
    const revealedDataUnpacked = unpackReveal(revealedData_packed, 'id');

    // Use extractField to get field values
    const ofacNameDobCheck = extractField(revealedDataUnpacked, 'OFAC_NAME_DOB_CHECK');
    const ofacNameYobCheck = extractField(revealedDataUnpacked, 'OFAC_NAME_YOB_CHECK');
    const minimumAge = extractField(revealedDataUnpacked, 'MINIMUM_AGE_VALID');

    // Verify non-revealed fields are null
    for (let i = 0; i < 115; i++) {
      assert(revealedDataUnpacked[i] === '\0', `Output ${i} should be null character`);
    }

    // Verify OFAC checks show person is in OFAC list
    assert(ofacNameYobCheck === 0, 'OFAC Name YOB should be 0 (in OFAC list)');
    assert(ofacNameDobCheck === 0, 'OFAC Name DOB should be 0 (in OFAC list)');
    assert(minimumAge.toString() === '0', 'Minimum Age should be 0');
  });
  it('ofac_check_result should be 0 if exists in ofac_name_dob_reverse_smt and ofac_name_yob_reverse_smt', async function () {
    this.timeout(0);
    const { inputs } = prepareAadhaarDiscloseTestData(
      privateKeyPem,
      tree,
      nameAndDob_smt,
      nameAndYob_smt,
      '333',
      '1234',
      '585225',
      '0',
      'ABBAS ABU',
      '10-12-1948',
      undefined,
      undefined,
      undefined,
      undefined,
      true
    );

    // Use createSelector to generate selector for revealing OFAC checks
    const selector = createSelector(['OFAC_NAME_DOB_CHECK', 'OFAC_NAME_YOB_CHECK']);
    inputs.selector = formatInput(selector)[0];
    inputs.minimumAge = ['100'];

    const w = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(w);

    const revealedData = await circuit.getOutput(w, [`revealData_packed[4]`]);

    const revealedData_packed = getPackedRevealData(revealedData);
    const revealedDataUnpacked = unpackReveal(revealedData_packed, 'id');

    // Use extractField to get field values
    const ofacNameDobCheck = extractField(revealedDataUnpacked, 'OFAC_NAME_DOB_CHECK');
    const ofacNameYobCheck = extractField(revealedDataUnpacked, 'OFAC_NAME_YOB_CHECK');
    const minimumAge = extractField(revealedDataUnpacked, 'MINIMUM_AGE_VALID');

    // Verify non-revealed fields are null
    for (let i = 0; i < 115; i++) {
      assert(revealedDataUnpacked[i] === '\0', `Output ${i} should be null character`);
    }

    // Verify OFAC checks show person is in OFAC list
    assert(ofacNameYobCheck === 0, 'OFAC Name YOB should be 0 (in OFAC list)');
    assert(ofacNameDobCheck === 0, 'OFAC Name DOB should be 0 (in OFAC list)');
    assert(minimumAge.toString() === '0', 'Minimum Age should be 0');
  });
});
