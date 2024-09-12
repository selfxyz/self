import { expect } from 'chai';
import { describe, it } from 'mocha';
import { groth16 } from 'snarkjs';
import { OpenPassportVerifier, OpenPassportVerifierInputs } from '../src/OpenPassportVerifier';
import { genMockPassportData } from '../../common/src/utils/genMockPassportData';
import { OpenPassportVerifierReport } from '../src/OpenPassportVerifierReport';
import { alphaCode, dateOfBirth, dateOfExpiry, getCountryName, majority, scope, TestCase, testCases } from './utils/testCases';
import { generateCircuitInputsInSdk } from './utils/generateInputsInSdk';


const runTest = async (testCase: TestCase) => {
  const { circuitType, algorithm, wasmPath, zkeyPath } = testCase;
  const passportData = genMockPassportData(algorithm, alphaCode, dateOfBirth, dateOfExpiry);
  const inputs = generateCircuitInputsInSdk(passportData, circuitType);
  const { proof, publicSignals } = await groth16.fullProve(inputs, wasmPath, zkeyPath);
  const openPassportVerifier = new OpenPassportVerifier({
    scope: scope,
    olderThan: majority,
    nationality: getCountryName(),
    dev_mode: true,
    circuit: circuitType,
  });

  const openPassportVerifierInputs = new OpenPassportVerifierInputs({
    dscProof: {
      publicSignals: publicSignals,
      proof: proof as any,
    },
    circuit: circuitType,
    dsc: passportData.dsc as string,
  });

  const result = await openPassportVerifier.verify(openPassportVerifierInputs);
  return { result, openPassportVerifierInputs };
};

const verifyResult = (
  result: OpenPassportVerifierReport,
  openPassportVerifierInputs: OpenPassportVerifierInputs
) => {
  if (!result.valid) {
    console.log(result);
  }
  expect(openPassportVerifierInputs.getNullifier()).not.to.be.null;
  console.log('\x1b[34mnullifier: \x1b[0m', openPassportVerifierInputs.getNullifier());
  expect(result.valid).to.be.true;
};

describe('\x1b[35mOpenPassportVerifier\x1b[0m', function () {
  this.timeout(0);

  testCases.forEach((testCase) => {
    const { circuitType, algorithm } = testCase;
    it(`${circuitType} - ${algorithm}`, async function () {
      const { result, openPassportVerifierInputs } = await runTest(testCase);
      verifyResult(result, openPassportVerifierInputs);
    });
  });
});
