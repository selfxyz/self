import { assert, expect } from 'chai';
import { describe, it } from 'mocha';
import { groth16 } from 'snarkjs';
import {
  generateCircuitInputsProve,
  generateCircuitInputsRegister,
} from '../../common/src/utils/generateInputs';
import { OpenPassportVerifier, OpenPassportVerifierInputs } from '../src/OpenPassportVerifier';
import { genMockPassportData } from '../../common/src/utils/genMockPassportData';
import { OpenPassportVerifierReport } from '../src/OpenPassportVerifierReport';
import crypto from 'crypto';
import {
  n_dsc,
  k_dsc,
  DEFAULT_MAJORITY,
  PASSPORT_ATTESTATION_ID,
} from '../../common/src/constants/constants';
describe('\x1b[95mOpenPassport1Step\x1b[0m', function () {
  this.timeout(0);

  /// Define common variables
  const user_identifier = crypto.randomUUID();
  const scope = '@spaceShips';
  const bitmap = Array(90).fill('1');

  describe('\x1b[96mregister circuits\x1b[0m', () => {
    it('OpenPassport1Step - register - rsa sha256', async function () {
      const path_prove_wasm = '../circuits/build/fromAWS/register_rsa_65537_sha256.wasm';
      const path_prove_zkey = '../circuits/build/fromAWS/register_rsa_65537_sha256.zkey';
      const passportData = genMockPassportData('rsa_sha256', 'FRA', '000101', '300101');
      const inputs = generateCircuitInputsRegister(
        BigInt(0).toString(),
        BigInt(0).toString(),
        PASSPORT_ATTESTATION_ID,
        passportData,
        n_dsc,
        k_dsc
      );
      const { proof, publicSignals } = await groth16.fullProve(
        inputs,
        path_prove_wasm,
        path_prove_zkey
      );
      const openPassportVerifier = new OpenPassportVerifier({
        scope: scope,
        olderThan: '18',
        nationality: 'France',
        dev_mode: true,
        circuit: 'register',
      });
      const openPassportVerifierInputs = new OpenPassportVerifierInputs({
        dscProof: {
          publicSignals: publicSignals,
          proof: proof as any,
        },
        circuit: 'register',
        dsc: passportData.dsc as string,
      });
      const result = await openPassportVerifier.verify(openPassportVerifierInputs);
      verifyResult(result, openPassportVerifierInputs);
    });

    it('OpenPassport1Step - register - rsa sha1', async function () {
      const path_prove_wasm = '../circuits/build/fromAWS/register_rsa_65537_sha1.wasm';
      const path_prove_zkey = '../circuits/build/fromAWS/register_rsa_65537_sha1.zkey';
      const passportData = genMockPassportData('rsa_sha1', 'FRA', '000101', '300101');
      const inputs = generateCircuitInputsRegister(
        BigInt(0).toString(),
        BigInt(0).toString(),
        PASSPORT_ATTESTATION_ID,
        passportData,
        n_dsc,
        k_dsc
      );
      const { proof, publicSignals } = await groth16.fullProve(
        inputs,
        path_prove_wasm,
        path_prove_zkey
      );
      const openPassportVerifier = new OpenPassportVerifier({
        scope: scope,
        olderThan: '18',
        nationality: 'France',
        dev_mode: true,
        circuit: 'register',
      });
      const openPassportVerifierInputs = new OpenPassportVerifierInputs({
        dscProof: {
          publicSignals: publicSignals,
          proof: proof as any,
        },
        circuit: 'register',
        dsc: passportData.dsc as string,
      });
      const result = await openPassportVerifier.verify(openPassportVerifierInputs);
      verifyResult(result, openPassportVerifierInputs);
    });

    it('OpenPassport1Step - register - rsapss sha256', async function () {
      const path_prove_wasm = '../circuits/build/fromAWS/register_rsapss_65537_sha256.wasm';
      const path_prove_zkey = '../circuits/build/fromAWS/register_rsapss_65537_sha256.zkey';
      const passportData = genMockPassportData('rsapss_sha256', 'FRA', '000101', '300101');
      const inputs = generateCircuitInputsRegister(
        BigInt(0).toString(),
        BigInt(0).toString(),
        PASSPORT_ATTESTATION_ID,
        passportData,
        n_dsc,
        k_dsc
      );
      const { proof, publicSignals } = await groth16.fullProve(
        inputs,
        path_prove_wasm,
        path_prove_zkey
      );
      const openPassportVerifier = new OpenPassportVerifier({
        scope: scope,
        olderThan: '18',
        nationality: 'France',
        dev_mode: true,
        circuit: 'register',
      });
      const openPassportVerifierInputs = new OpenPassportVerifierInputs({
        dscProof: {
          publicSignals: publicSignals,
          proof: proof as any,
        },
        circuit: 'register',
        dsc: passportData.dsc as string,
      });
      const result = await openPassportVerifier.verify(openPassportVerifierInputs);
      verifyResult(result, openPassportVerifierInputs);
    });
  });

  describe('\x1b[96mprove circuits\x1b[0m', () => {
    it('OpenPassport1Step - rsa sha256', async function () {
      const path_prove_wasm = '../circuits/build/fromAWS/prove_rsa_65537_sha256.wasm';
      const path_prove_zkey = '../circuits/build/fromAWS/prove_rsa_65537_sha256.zkey';
      const passportData = genMockPassportData('rsa_sha256', 'FRA', '000101', '300101');
      const inputs = generateCircuitInputsProve(
        passportData,
        n_dsc,
        k_dsc,
        scope,
        bitmap,
        DEFAULT_MAJORITY,
        user_identifier
      );
      const { proof, publicSignals } = await groth16.fullProve(
        inputs,
        path_prove_wasm,
        path_prove_zkey
      );
      const openPassportVerifier = new OpenPassportVerifier({
        scope: scope,
        olderThan: '18',
        nationality: 'France',
        dev_mode: true,
        circuit: 'prove',
      });
      const openPassportVerifierInputs = new OpenPassportVerifierInputs({
        dscProof: {
          publicSignals: publicSignals,
          proof: proof as any,
        },
        dsc: passportData.dsc as string,
        circuit: 'prove',
      });
      const result = await openPassportVerifier.verify(openPassportVerifierInputs);
      verifyResult(result, openPassportVerifierInputs);
    });

    it('OpenPassport1Step - rsa sha1', async function () {
      const path_prove_wasm = '../circuits/build/fromAWS/prove_rsa_65537_sha1.wasm';
      const path_prove_zkey = '../circuits/build/fromAWS/prove_rsa_65537_sha1.zkey';
      const passportData = genMockPassportData('rsa_sha1', 'FRA', '000101', '300101');
      const inputs = generateCircuitInputsProve(
        passportData,
        n_dsc,
        k_dsc,
        scope,
        bitmap,
        DEFAULT_MAJORITY,
        user_identifier
      );
      const { proof, publicSignals } = await groth16.fullProve(
        inputs,
        path_prove_wasm,
        path_prove_zkey
      );
      const openPassportVerifier = new OpenPassportVerifier({
        scope: scope,
        olderThan: '18',
        nationality: 'France',
        dev_mode: true,
        circuit: 'prove',
      });
      const openPassportVerifierInputs = new OpenPassportVerifierInputs({
        dscProof: {
          publicSignals: publicSignals,
          proof: proof as any,
        },
        dsc: passportData.dsc as string,
        circuit: 'prove',
      });
      const result = await openPassportVerifier.verify(openPassportVerifierInputs);
      verifyResult(result, openPassportVerifierInputs);
    });

    it('OpenPassport1Step - rsapss sha256', async function () {
      const path_prove_wasm = '../circuits/build/fromAWS/prove_rsapss_65537_sha256.wasm';
      const path_prove_zkey = '../circuits/build/fromAWS/prove_rsapss_65537_sha256.zkey';
      const passportData = genMockPassportData('rsapss_sha256', 'FRA', '000101', '300101');
      const inputs = generateCircuitInputsProve(
        passportData,
        n_dsc,
        k_dsc,
        scope,
        bitmap,
        DEFAULT_MAJORITY,
        user_identifier
      );
      const { proof, publicSignals } = await groth16.fullProve(
        inputs,
        path_prove_wasm,
        path_prove_zkey
      );
      const openPassportVerifier = new OpenPassportVerifier({
        scope: scope,
        olderThan: '18',
        nationality: 'France',
        dev_mode: true,
        circuit: 'prove',
      });
      const openPassportVerifierInputs = new OpenPassportVerifierInputs({
        dscProof: {
          publicSignals: publicSignals,
          proof: proof as any,
        },
        dsc: passportData.dsc as string,
        circuit: 'prove',
      });
      const result = await openPassportVerifier.verify(openPassportVerifierInputs);
      verifyResult(result, openPassportVerifierInputs);
    });
  });

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
});
