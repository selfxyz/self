import { assert, expect } from 'chai';
import { describe, it } from 'mocha';
import { convertStringToByteArrayPad, ProcessReferenceId } from '../../src/utils/aadhaar/utils';
import {
  generateCommitmentAadhaar,
  nameHash,
  prepareTestData,
  splitTestData,
  DobHash,
  generateNullifier,
} from '../../src/utils/aadhaar/aadhaar';

//Test the util functions
describe('utils', function () {
  it('ProcessReferenceId()-should return the last 4 Aadhaar digits and the UTC‐Unix timestamp rounded down to the hour', function () {
    const refId = '269720190308114407437';
    const { last4Digits } = ProcessReferenceId(refId);
    assert.strictEqual(last4Digits, '2697');
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
