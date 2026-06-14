import { expect } from 'chai';
import { wasm as wasmTester } from 'circom_tester';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { CIRCOM_INCLUDE_PATHS } from '../../circomIncludePaths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('isOlderThan', async () => {
  let circuit;

  before(async () => {
    circuit = await wasmTester(path.join(__dirname, 'is_older_than.test.circom'), {
      include: CIRCOM_INCLUDE_PATHS,
    });
  });

  it('should return true if the user is older than the majority', async () => {
    console.log(['1', '9', '9', '4', '0', '4', '0', '2'].map((x) => x.charCodeAt(0)));
    const inputs = {
      majorityASCII: [48, 48, 48 + 2], //2 years old
      currDate: [1, 9, 9, 6, 0, 4, 0, 2],
      birthDateASCII: ['1', '9', '9', '4', '0', '4', '0', '1'].map((x) => x.charCodeAt(0)),
    };

    const witness = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(witness);

    const output = await circuit.getOutput(witness, ['out']);
    expect(output.out).to.equal('1');
  });

  it('should not return false if the user is younger than the majority', async () => {
    const inputs = {
      majorityASCII: [48, 48, 48 + 2], //2 years old
      currDate: [1, 9, 9, 5, 0, 4, 0, 2],
      birthDateASCII: ['1', '9', '9', '4', '0', '4', '0', '2'].map((x) => x.charCodeAt(0)),
    };

    const witness = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(witness);

    const output = await circuit.getOutput(witness, ['out']);
    expect(output.out).to.equal('0');
  });

  it('should not return true if the user birthdate is in the majority year but the current date is not', async () => {
    const inputs = {
      majorityASCII: [48, 48, 48 + 2], //2 years old
      currDate: [1, 9, 9, 6, 0, 4, 0, 1],
      birthDateASCII: ['1', '9', '9', '4', '0', '4', '0', '3'].map((x) => x.charCodeAt(0)),
    };

    const witness = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(witness);

    const output = await circuit.getOutput(witness, ['out']);
    expect(output.out).to.equal('0');
  });
});
