import { describe } from 'mocha';
import { assert, expect } from 'chai';
import path from 'path';
import { wasm as wasm_tester } from 'circom_tester';
import { poseidon1 } from 'poseidon-lite';
import { mockPassportData_sha256_rsapss_65537 } from '../../../common/src/constants/mockPassportData';
import { generateCircuitInputsProve } from '../../../common/src/utils/generateInputs';

describe('PROVE - RSAPSS SHA256', function () {
  this.timeout(0);
  let circuit: any;

  const passportData = mockPassportData_sha256_rsapss_65537;
  const n_dsc = 64;
  const k_dsc = 32;
  const majority = '18';
  const user_identifier = crypto.randomUUID();
  const scope = "@coboyApp";
  const bitmap = Array(90).fill('1');

  const inputs = generateCircuitInputsProve(
    passportData,
    n_dsc,
    k_dsc,
    scope,
    bitmap,
    majority,
    user_identifier
  );

  before(async () => {
    circuit = await wasm_tester(
      path.join(__dirname, '../../circuits/prove/prove_rsapss_65537_sha256.circom'),
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

    const nullifier = (await circuit.getOutput(w, ['nullifier'])).nullifier;
    expect(nullifier).to.be.not.null;
  });

  it('should fail to calculate witness with invalid mrz', async function () {
    try {
      const invalidInputs = {
        ...inputs,
        mrz: Array(93)
          .fill(0)
          .map((byte) => BigInt(byte).toString()),
      };
      await circuit.calculateWitness(invalidInputs);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
    }
  });

  it('should fail to calculate witness with invalid dataHashes', async function () {
    try {
      const invalidInputs = {
        ...inputs,
        dataHashes: inputs.dataHashes.map((byte: string) => String((parseInt(byte, 10) + 1) % 256)),
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
        signature: inputs.signature.map((byte: string) => String((parseInt(byte, 10) + 1) % 256)),
      };
      await circuit.calculateWitness(invalidInputs);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
    }
  });
});
