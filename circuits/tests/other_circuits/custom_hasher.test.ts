import { expect } from 'chai';
import path from 'path';
import { wasm as wasm_tester } from 'circom_tester';
import { formatInput } from '@selfxyz/common/utils/circuits/generateInputs';
import { customHasher, packBytesAndPoseidon } from '@selfxyz/common/utils/hash';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('CustomHasher', function () {
  this.timeout(0);
  let circuitCustomHasher;
  let circuitPackBytesAndPoseidon;

  this.beforeAll(async () => {
    const circuitPathCustomHasher = path.resolve(
      __dirname,
      '../../circuits/tests/utils/customHasher_tester.circom'
    );
    const circuitPathPackBytesAndPoseidon = path.resolve(
      __dirname,
      '../../circuits/tests/utils/packBytesAndPoseidon_tester.circom'
    );
    circuitCustomHasher = await wasm_tester(circuitPathCustomHasher, {
      include: [
        'node_modules',
        'node_modules/@zk-kit/binary-merkle-root.circom/src',
        'node_modules/circomlib/circuits',
      ],
    });
    circuitPackBytesAndPoseidon = await wasm_tester(circuitPathPackBytesAndPoseidon, {
      include: [
        'node_modules',
        'node_modules/@zk-kit/binary-merkle-root.circom/src',
        'node_modules/circomlib/circuits',
      ],
    });
  });

  describe('custom hasher', async () => {
    const randomNumbers = Array(16)
      .fill(0)
      .map(() => {
        const maxVal = BigInt(2) ** BigInt(250);
        const randomVal =
          BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)) *
          BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
        return (randomVal % maxVal).toString();
      });
    const inputs = { in: formatInput(randomNumbers) };

    it('customHasher output should be the same between circom and js implementation', async () => {
      const witness = await circuitCustomHasher.calculateWitness(inputs, true);
      const hashValueCircom = (await circuitCustomHasher.getOutput(witness, ['out'])).out;
      console.log('\x1b[34m', 'hashValueCircom: ', hashValueCircom, '\x1b[0m');
      const hashValueJs = customHasher(randomNumbers);
      console.log('\x1b[34m', 'hashValueJs: ', hashValueJs, '\x1b[0m');
      expect(BigInt(hashValueCircom).toString()).to.equal(BigInt(hashValueJs).toString());
    });
  });

  describe('packBytesAndPoseidon', async () => {
    let randomNumbers = Array(16)
      .fill(0)
      .map(() => {
        return Math.floor(Math.random() * 256); // Random number between 0 and 255
      });
    const inputs = { in: formatInput(randomNumbers) };
    console.log('\x1b[34m', 'inputs: ', inputs, '\x1b[0m');

    it('packBytesAndPoseidon output should be the same between circom and js implementation', async () => {
      const witness = await circuitPackBytesAndPoseidon.calculateWitness(inputs, true);
      const hashValueCircom = (await circuitPackBytesAndPoseidon.getOutput(witness, ['out'])).out;
      console.log('\x1b[34m', 'hashValueCircom: ', hashValueCircom, '\x1b[0m');
      const hashValueJs = packBytesAndPoseidon(randomNumbers);
      console.log('\x1b[34m', 'hashValueJs: ', hashValueJs, '\x1b[0m');
      expect(BigInt(hashValueCircom).toString()).to.equal(BigInt(hashValueJs).toString());
    });

    it('packBytesAndPoseidon should fail, inputs[0] = 256', async () => {
      try {
        const wrongRandomNumbers = [...randomNumbers];
        wrongRandomNumbers[0] = 256;
        const wrongInputs = { in: formatInput(wrongRandomNumbers) };
        const witness = await circuitPackBytesAndPoseidon.calculateWitness(wrongInputs, true);
        expect.fail('Expected an error but none was thrown.');
      } catch (error) {
        expect(error.message).to.include('Assert Failed');
      }
    });

    it('packBytesAndPoseidon should fail, inputs[15] = 256', async () => {
      try {
        const wrongRandomNumbers = [...randomNumbers];
        wrongRandomNumbers[15] = 256;
        const wrongInputs = { in: formatInput(wrongRandomNumbers) };
        const witness = await circuitPackBytesAndPoseidon.calculateWitness(wrongInputs, true);
        expect.fail('Expected an error but none was thrown.');
      } catch (error) {
        expect(error.message).to.include('Assert Failed');
      }
    });
  });
});
