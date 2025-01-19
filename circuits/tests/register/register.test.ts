import { describe } from 'mocha';
import { assert, expect } from 'chai';
import path from 'path';
import { wasm as wasm_tester } from 'circom_tester';
import { generateCircuitInputsRegister } from '../../../common/src/utils/generateInputs';
import { genMockPassportData } from '../../../common/src/utils/genMockPassportData';
import { SignatureAlgorithm } from '../../../common/src/utils/types';
import { poseidon2 } from 'poseidon-lite';
import { SMT } from '@openpassport/zk-kit-smt';
import namejson from '../../../common/ofacdata/outputs/nameSMT.json';
import { getCircuitNameFromPassportData } from '../../../common/src/utils/circuitsName';
import { getNullifier } from '../../../common/src/utils/utils';
import { sigAlgs, fullSigAlgs } from './test_cases';

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

      const passportData = genMockPassportData(
        dgHashAlgo,
        eContentHashAlgo,
        `${sigAlg}_${hashFunction}_${domainParameter}_${keyLength}` as SignatureAlgorithm,
        'FRA',
        '000101',
        '300101'
      );
      const secret = 0;
      const dsc_secret = 0;

      let name_smt = new SMT(poseidon2, true);
      name_smt.import(namejson);
      const inputs = generateCircuitInputsRegister(secret, dsc_secret, passportData);

      before(async () => {
        circuit = await wasm_tester(
          path.join(
            __dirname,
            `../../circuits/register/instances/${getCircuitNameFromPassportData(passportData)}.circom`
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

      it('should compile and load the circuit', async function () {
        expect(circuit).to.not.be.undefined;
      });

      it('should calculate the witness with correct inputs', async function () {
        const w = await circuit.calculateWitness(inputs);
        await circuit.checkConstraints(w);
        if (!checkNullifier) {
          return;
        }

        const expectedNullifier = getNullifier(inputs.signed_attr, hashFunction);

        const nullifier = (await circuit.getOutput(w, ['nullifier'])).nullifier;
        assert(expectedNullifier == nullifier);

        console.log('\x1b[34m%s\x1b[0m', 'nullifier', nullifier);
        const commitment = (await circuit.getOutput(w, ['commitment'])).commitment;
        console.log('\x1b[34m%s\x1b[0m', 'commitment', commitment);
        const blinded_dsc_commitment = (await circuit.getOutput(w, ['blinded_dsc_commitment']))
          .blinded_dsc_commitment;
        console.log('\x1b[34m%s\x1b[0m', 'blinded_dsc_commitment', blinded_dsc_commitment);
        expect(blinded_dsc_commitment).to.be.not.null;
        expect(nullifier).to.be.not.null;
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
            signature: inputs.signature.map((byte: string) =>
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
