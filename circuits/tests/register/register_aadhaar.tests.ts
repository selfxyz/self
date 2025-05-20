// eslint-disable-next-line @typescript-eslint/no-var-requires
const circom_tester = require('circom_tester/wasm/tester');

import fs from 'fs';
import assert from 'assert';
import path from 'path';
import dotenv from 'dotenv';
import { bigIntToChunkedBytes } from '@zk-email/helpers/dist/binary-format';
import { timestampToUTCUnix } from '@anon-aadhaar/core';
import { buildPoseidon } from 'circomlibjs';
import {
  prepareTestData,
  splitTestData,
  generateCommitmentAadhaar,
  generateNullifier,
} from '../../../common/src/utils/aadhaar/aadhaar';

dotenv.config();

describe('Register-Aadhaar', function () {
  this.timeout(0);

  let circuit: any;

  this.beforeAll(async () => {
    circuit = await circom_tester(
      path.join(__dirname, '../../circuits/register/instances/register_aadhaar.circom'),
      {
        include: [
          'node_modules',
          './node_modules/@zk-kit/binary-merkle-root.circom/src',
          './node_modules/circomlib/circuits',
        ],
      }
    );
  });

  it('should generate witness for circuit', async () => {
    const { inputs } = prepareTestData();
    await circuit.calculateWitness(inputs);
  });

  it('should output hash of pubkey', async () => {
    const { inputs, pubKey } = prepareTestData();

    const witness = await circuit.calculateWitness(inputs);

    // Calculate the Poseidon hash with pubkey chunked to 9*242 like in circuit
    const poseidon = await buildPoseidon();
    const pubkeyChunked = bigIntToChunkedBytes(pubKey, 242, 9);
    const hash = poseidon(pubkeyChunked);

    assert(witness[1] === BigInt(poseidon.F.toObject(hash)));
  });

  it('should output timestamp of when data is generated', async () => {
    const { inputs, decodedData } = prepareTestData();

    const witness = await circuit.calculateWitness(inputs);

    //example
    // This is the time in the QR data above is 20190308114407437.
    // 2019-03-08 11:44:07.437 rounded down to nearest hour is 2019-03-08 11:00:00.000
    // Converting this IST to UTC gives 2019-03-08T05:30:00.000Z
    const expectedTimestamp = timestampToUTCUnix(decodedData);

    assert(witness[2] === BigInt(expectedTimestamp));
  });

  it('should compute nullifier correctly', async () => {
    const { inputs, qrDataPadded, delimiterIndices } = prepareTestData();
    const witness = await circuit.calculateWitness(inputs);
    const fields = splitTestData(qrDataPadded, delimiterIndices);
    const nullifier = await generateNullifier(fields);

    assert(witness[3] == BigInt(nullifier));
  });

  it('Should compute commitment correctly', async () => {
    const { inputs, qrDataPadded, delimiterIndices } = prepareTestData();
    const witness = await circuit.calculateWitness(inputs);
    // const fields = splitTestData(qrDataPadded, delimiterIndices)
    const commitment = await generateCommitmentAadhaar(inputs.secret, BigInt(3), qrDataPadded);
    assert(witness[4] == BigInt(commitment));
  });
});
