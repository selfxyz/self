import { describe } from 'mocha';
import { expect } from 'chai';
import path from 'path';
import { wasm as wasm_tester } from 'circom_tester';
import { generateCircuitInputsProve } from '../../common/src/utils/generateInputs';
import { n_dsc, k_dsc } from '../../common/src/constants/constants';
import { genMockPassportData } from '../../common/src/utils/genMockPassportData';
import { getCircuitName } from '../../common/src/utils/handleCertificate';
import { SignatureAlgorithm } from '../../common/tests/genMockPassportData.test';

const sigAlgs = [
  { sigAlg: 'rsa', hashFunction: 'sha1' },
  { sigAlg: 'rsa', hashFunction: 'sha256' },
  { sigAlg: 'rsapss', hashFunction: 'sha256' },
];

sigAlgs.forEach(({ sigAlg, hashFunction }) => {
  describe(`Prove - ${hashFunction.toUpperCase()} ${sigAlg.toUpperCase()}`, function () {
    this.timeout(0);
    let circuit: any;

    const passportData = genMockPassportData(`${sigAlg}_${hashFunction}` as SignatureAlgorithm, 'FRA', '000101', '300101');
    const majority = '18';
    const user_identifier = crypto.randomUUID();
    const scope = '@coboyApp';
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
        path.join(__dirname, `../../circuits/prove/${getCircuitName('prove', sigAlg, hashFunction)}.circom`),
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
});
