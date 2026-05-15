import { expect } from 'chai';
import { wasm as wasmTester } from 'tests/utils/circomTesterCompat.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('date', async () => {
  let circuit;

  before(async () => {
    circuit = await wasmTester(path.join(__dirname, 'is_valid.test.circom'), {
      include: ['node_modules', 'node_modules/@zk-kit/binary-merkle-root.circom/src'],
    });
  });

  it('should return true if the year is less', async () => {
    const inputs = {
      current_date: [1, 9, 9, 4, 0, 4, 1, 2],
      validity_date_ascii: '19950412'.split('').map((x) => x.charCodeAt(0)),
    };

    console.log(inputs);

    const witness = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(witness);

    expect(witness[0]).to.equal(1n);
  });

  it('should return false if the year is greater', async () => {
    const inputs = {
      current_date: [1, 9, 9, 6, 0, 4, 1, 2],
      validity_date_ascii: '19950412'.split('').map((x) => x.charCodeAt(0)),
    };

    try {
      const witness = await circuit.calculateWitness(inputs);
      await circuit.checkConstraints(witness);

      throw new Error('should return false if the year is greater: FAILED');
    } catch (error) {
      expect(error).to.exist;
    }
  });

  it('should return true if the year is equal and month is less', async () => {
    const inputs = {
      current_date: [1, 9, 9, 6, 0, 3, 1, 2],
      validity_date_ascii: '19960412'.split('').map((x) => x.charCodeAt(0)),
    };

    const witness = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(witness);

    expect(witness[0]).to.equal(1n);
  });

  it('should return false if the year is equal and month is greater', async () => {
    const inputs = {
      current_date: [1, 9, 9, 6, 0, 5, 1, 2],
      validity_date_ascii: '19960412'.split('').map((x) => x.charCodeAt(0)),
    };

    try {
      const witness = await circuit.calculateWitness(inputs);
      await circuit.checkConstraints(witness);

      throw new Error('should return false if the year is equal and month is greater: FAILED');
    } catch (error) {
      expect(error).to.exist;
    }
  });

  it('should return true if the year is equal and month is equal and day is less', async () => {
    const inputs = {
      current_date: [1, 9, 9, 6, 0, 4, 0, 2],
      validity_date_ascii: '19960412'.split('').map((x) => x.charCodeAt(0)),
    };

    const witness = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(witness);

    expect(witness[0]).to.equal(1n);
  });

  it('should return false if the year is equal and month is equal and day is greater', async () => {
    const inputs = {
      current_date: [1, 9, 9, 6, 0, 4, 0, 3],
      validity_date_ascii: '19960412'.split('').map((x) => x.charCodeAt(0)),
    };

    try {
      const witness = await circuit.calculateWitness(inputs);
      await circuit.checkConstraints(witness);

      throw new Error(
        'should return false if the year is equal and month is equal and day is greater: FAILED'
      );
    } catch (error) {
      expect(error).to.exist;
    }
  });

  it('should return false if the year is equal and month is equal and day is equal', async () => {
    const inputs = {
      current_date: [1, 9, 9, 6, 0, 4, 0, 2],
      validity_date_ascii: '19960412'.split('').map((x) => x.charCodeAt(0)),
    };

    try {
      const witness = await circuit.calculateWitness(inputs);
      await circuit.checkConstraints(witness);

      throw new Error(
        'should return false if the year is equal and month is equal and day is equal: FAILED'
      );
    } catch (error) {
      expect(error).to.exist;
    }
  });
});
