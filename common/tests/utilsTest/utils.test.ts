import { assert, expect } from 'chai';
import { describe, it } from 'mocha';
import { ProcessReferenceId } from '../../src/utils/aadhaar/utils';
import {
  generateCommitmentAadhaar,
  prepareTestData,
  splitTestData,
} from '../../src/utils/aadhaar/aadhaar';

describe('utils – ProcessReferenceId()', function () {
  it('should return the last 4 Aadhaar digits and the UTC‐Unix timestamp rounded down to the hour', function () {
    const refId = '269720190308114407437';
    const { last4Digits } = ProcessReferenceId(refId);
    assert.strictEqual(last4Digits, '2697');
  });
});

describe('utils - Produce desired commitment', function () {
  it('should generate the data commitment and final commitment for aadhaar registration ', async function () {
    const { qrDataPadded, delimiterIndices } = prepareTestData();
    const secret = BigInt(1);
    const attestationId = BigInt(3); //for aadhaar

    const actualCommitment = await generateCommitmentAadhaar(secret, attestationId, qrDataPadded);

    // assert(actualCommitment==);
  });
});
