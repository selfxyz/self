import { describe } from 'mocha';
import { expect } from 'chai';
import path from 'path';
import { wasm as wasm_tester } from 'circom_tester';
import { generateCircuitInputsRegister } from '../../../common/src/utils/circuits/generateInputs';
import { genMockPassportData } from '../../../common/src/utils/passports/genMockPassportData';
import { SignatureAlgorithm } from '../../../common/src/utils/types';
import { getCircuitNameFromPassportData } from '../../../common/src/utils/circuits/circuitsName';
import { sigAlgs, fullSigAlgs } from './test_cases';
import { generateCommitment, generateNullifier, initPassportDataParsing } from '../../../common/src/utils/passports/passport';
import { poseidon6 } from 'poseidon-lite';

const testSuite = process.env.FULL_TEST_SUITE === 'true' ? fullSigAlgs : sigAlgs;

testSuite.forEach(
  ({
    dgHashAlgo,
    eContentHashAlgo,
    sigAlg,
    hashFunction,
    domainParameter,
    keyLength,
    checkNullifier,
  }) => {
    describe(`Register - ${dgHashAlgo.toUpperCase()} ${eContentHashAlgo.toUpperCase()} ${hashFunction.toUpperCase()} ${sigAlg.toUpperCase()} ${domainParameter} ${keyLength}`, function () {
      this.timeout(0);
      let circuit: any;

      let passportData = genMockPassportData(
        dgHashAlgo,
        eContentHashAlgo,
        `${sigAlg}_${hashFunction}_${domainParameter}_${keyLength}` as SignatureAlgorithm,
        'FRA',
        '000101',
        '300101'
      );
      passportData = initPassportDataParsing(passportData);

      const secret = poseidon6("SECRET".split('').map(x => BigInt(x.charCodeAt(0)))).toString();

      const inputs = generateCircuitInputsRegister(secret, passportData);

      before(async () => {
        circuit = await wasm_tester(
          path.join(
            __dirname,
            `../../circuits/register/instances/${getCircuitNameFromPassportData(passportData, 'register')}.circom`
          ),
          {
            include: [
              'node_modules',
              './node_modules/@zk-kit/binary-merkle-root.circom/src',
              './node_modules/circomlib/circuits',
            ],
          }
        );
      });

      it.only('should compile and load the circuit', async function () {
        expect(circuit).to.not.be.undefined;
      });

      it.only('should calculate the witness with correct inputs', async function () {
        const w = await circuit.calculateWitness(inputs);
        await circuit.checkConstraints(w);

        if (!checkNullifier) {
          return;
        }

        const nullifier_js = generateNullifier(passportData);
        console.log('\x1b[35m%s\x1b[0m', 'js: nullifier:', nullifier_js);
        const nullifier = (await circuit.getOutput(w, ['nullifier'])).nullifier;
        console.log('\x1b[34m%s\x1b[0m', 'circom: nullifier', nullifier);

        // const commitment_js = generateCommitment(secret.toString(), attestation_id, passportData);
        // console.log('\x1b[35m%s\x1b[0m', 'js: commitment:', commitment_js);
        // const commitment = (await circuit.getOutput(w, ['commitment'])).commitment;
        // console.log('\x1b[34m%s\x1b[0m', 'circom commitment', commitment);

        expect(nullifier).to.be.equal(nullifier_js);
        // expect(commitment).to.be.equal(commitment_js);
      });

      it('should fail to calculate witness with invalid mrz', async function () {
        try {
          const invalidInputs = {
            ...inputs,
            dg1: Array(93)
              .fill(0)
              .map((byte) => BigInt(byte).toString()),
          };
          await circuit.calculateWitness(invalidInputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error) {
          expect(error.message).to.include('Assert Failed');
        }
      });

      it('should fail to calculate witness with invalid eContent', async function () {
        try {
          const invalidInputs = {
            ...inputs,
            eContent: inputs.eContent.map((byte: string) => String((parseInt(byte, 10) + 1) % 256)),
          };
          await circuit.calculateWitness(invalidInputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error) {
          expect(error.message).to.include('Assert Failed');
        }
      });

      it('should fail to calculate witness with invalid signature', async function () {
        try {
          const invalidInputs = {
            ...inputs,
            signature_passport: inputs.signature_passport.map((byte: string) =>
              String((parseInt(byte, 10) + 1) % 256)
            ),
          };
          await circuit.calculateWitness(invalidInputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error) {
          expect(error.message).to.include('Assert Failed');
        }
      });
    });
  }
);
