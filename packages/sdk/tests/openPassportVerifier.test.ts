import { expect } from 'chai';
import { describe, it } from 'mocha';
import { groth16 } from 'snarkjs';
import { OpenPassportVerifier } from '../src/OpenPassportVerifier';
import { genMockPassportData } from '../../common/src/utils/genMockPassportData';
import { OpenPassportVerifierReport } from '../src/OpenPassportVerifierReport';
import {
  alphaCode,
  dateOfBirth,
  dateOfExpiry,
  getCountryName,
  majority,
  scope,
  TestCase,
  testCases,
} from './utils/testCases';
import { generateCircuitInputsInSdk } from './utils/generateInputsInSdk';
import {
  buildAttestation,
  OpenPassportDynamicAttestation,
} from '../../common/src/utils/openPassportAttestation';

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

  const attestation = buildAttestation({
    proof: proof as any,
    publicSignals: publicSignals,
    dsc: passportData.dsc as string,
  });
  console.log('\x1b[34mattestation: \x1b[0m', attestation);

  const result = await openPassportVerifier.verify(attestation);
  return { result, attestation };
};

const verifyResult = (
  result: OpenPassportVerifierReport,
  attestation: OpenPassportDynamicAttestation
) => {
  if (!result.valid) {
    console.log(result);
  }
  console.log('\x1b[34mnullifier: \x1b[0m', attestation.getNullifier());
  expect(result.valid).to.be.true;
};

describe('\x1b[35mOpenPassportVerifier\x1b[0m', function () {
  this.timeout(0);

  testCases.forEach((testCase) => {
    const { circuitType, algorithm } = testCase;
    it(`${circuitType} - ${algorithm}`, async function () {
      const { result, attestation } = await runTest(testCase);
      verifyResult(result, attestation);
    });
  });
});
