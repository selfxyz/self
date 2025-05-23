import { assert, expect } from 'chai';
import { describe, it } from 'mocha';
import { convertStringToByteArrayPad, ProcessReferenceId } from '../../src/utils/aadhaar/utils';
import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { poseidon1, poseidon2 } from 'poseidon-lite';
import { SMT } from '@openpassport/zk-kit-smt';

import {
  generateCommitmentAadhaar,
  nameHash,
  prepareTestData,
  splitTestData,
  DobHash,
  generateNullifier,
  generateCircuitInputsAadhaarVCandDisclose,
  prepareTestDataExtractor,
} from '../../src/utils/aadhaar/aadhaar';
import nameAndDobjson from '../../ofacdata/outputs/nameAndDobSMT_Aadhaar.json';
import nameAndYobjson from '../../ofacdata/outputs/nameAndYobSMT_Aadhaar.json';

//Test the util functions
describe('utils', function () {
  it('ProcessReferenceId()-should return the last 4 Aadhaar digits and the UTC‐Unix timestamp rounded down to the hour', function () {
    const refId = '269720190308114407437';
    const { last4Digits } = ProcessReferenceId(refId);
    assert.strictEqual(last4Digits, '2697');
  });

  it('genertaes inputs for extractor', async function () {
    const { inputs } = prepareTestDataExtractor();
    const values = inputs;
  });

  it('encodes "name" and calculate namehash', async function () {
    const maxBytes = 256;
    const result = convertStringToByteArrayPad('Sumit Kumar', maxBytes);

    const namehashtemp = await nameHash(result);
    const namehash = BigInt(namehashtemp);
    const value = BigInt(
      '948855446484890256796791120157965939898937470990304708559398895582336127482'
    );
    assert(namehash == value);
  });

  it('should compute Poseidon hash of DOB', async function () {
    const dob = '01-01-1984'; // DOB: "01-01-1984",
    const result = await DobHash(dob);
    const value = BigInt(
      '124042181534158974680486158040584178760834524593809439015791333757793339013'
    );
  });
});

// Test the commitment production
describe('Produce desired commitment', function () {
  it('should generate the data commitment and final commitment for aadhaar registration ', async function () {
    const { qrDataPadded, delimiterIndices } = prepareTestData();
    const secret = BigInt(0);
    const attestationId = BigInt(3); //for aadhaar
    const value = BigInt(
      '323373849911026295981485308378167295217106366770003265244905549589414909141'
    );
    const actualCommitment = await generateCommitmentAadhaar(secret, attestationId, qrDataPadded);
    assert(actualCommitment === value);
  });
});

//test the Nulllifer Production
describe('produce desired nullifier', function () {
  it('should generate the correct nullifier for aadhaar', async function () {
    const { qrDataPadded, delimiterIndices } = prepareTestData();
    const fields = splitTestData(qrDataPadded, delimiterIndices);
    const nullifier = await generateNullifier(fields);
    // console.log(nullifier);

    const value = BigInt(
      '14300676060298489109925451265331000889291307788153914741032606453496314896133'
    );
    assert(value == nullifier);
  });
});

describe('Should output the vc_and_disclose Cicuit input', async function () {
  it('should output Inputs to vc_and_disclose Circuit for aadhaar', async function () {
    const secret = BigInt(0);
    const attestationId = BigInt(3); //for aadhaar

    const {
      inputs: regInputs,
      qrDataPadded,
      qrDataPaddedLen,
      delimiterIndices,
    } = prepareTestData();
    const tree = new LeanIMT((a, b) => poseidon2([a, b]), []);
    const commitment = await generateCommitmentAadhaar(secret, attestationId, qrDataPadded);
    tree.insert(commitment);
    const nameDobSMT = new SMT(poseidon2, true);
    nameDobSMT.import(nameAndDobjson);
    const nameYobSMT = new SMT(poseidon2, true);
    nameYobSMT.import(nameAndYobjson);
    const userId = crypto.randomUUID();
    const inputs = await generateCircuitInputsAadhaarVCandDisclose(
      tree,
      nameDobSMT,
      nameYobSMT,
      userId,
      {
        selectors: {
          revealAge: true,
          revealGender: true,
          revealPin: true,
          revealState: true,
          selectorOfac: true,
        },
        majorityYears: 18,
        scope: '1',
        userIdentifier: userId,
        // now: new Date("2025-12-01T00:00:00Z"), // override date if you like
      }
    );
    console.log(inputs);
  });
});
