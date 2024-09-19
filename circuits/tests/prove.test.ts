import { describe } from 'mocha';
import { expect } from 'chai';
import path from 'path';
import { wasm as wasm_tester } from 'circom_tester';
import { generateCircuitInputsProve } from '../../common/src/utils/generateInputs';
import { genMockPassportData } from '../../common/src/utils/genMockPassportData';
import { getCircuitName } from '../../common/src/utils/certificates/handleCertificate';
import { SignatureAlgorithm } from '../../common/src/utils/types';
import crypto from 'crypto';

const sigAlgs = [
  // { sigAlg: 'rsa', hashFunction: 'sha1' },
  { sigAlg: 'rsa', hashFunction: 'sha256' },
  // { sigAlg: 'rsapss', hashFunction: 'sha256' },
  // { sigAlg: 'ecdsa', hashFunction: 'sha256' },
  // { sigAlg: 'ecdsa', hashFunction: 'sha1' },
];

sigAlgs.forEach(({ sigAlg, hashFunction }) => {
  describe(`Prove - ${hashFunction.toUpperCase()} ${sigAlg.toUpperCase()}`, function () {
    this.timeout(0);
    let circuit: any;

    const passportData = genMockPassportData(
      `${sigAlg}_${hashFunction}` as SignatureAlgorithm,
      'FRA',
      '000101',
      '300101'
    );
    const majority = '18';
    const user_identifier = crypto.randomUUID();
    const scope = '@coboyApp';
    const selector_dg1 = Array(88).fill('1');
    const selector_older_than = '1';

    const inputs = generateCircuitInputsProve(
      passportData,
      scope,
      selector_dg1,
      selector_older_than,
      majority,
      user_identifier
    );

    before(async () => {
      circuit = await wasm_tester(
        path.join(
          __dirname,
          `../circuits/prove/instances/${getCircuitName('prove', sigAlg, hashFunction)}.circom`
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
      const nullifier = (await circuit.getOutput(w, ['nullifier'])).nullifier;
      console.log('\x1b[34m%s\x1b[0m', 'nullifier', nullifier);
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
          eContent: inputs.eContent.map((byte: string) =>
            String((parseInt(byte, 10) + 1) % 256)
          ),
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
