import { expect } from 'chai';
import path from 'path';
import { wasm as wasm_tester } from 'circom_tester';

import { formatDg2Hash, formatMrz, packBytes } from '../../../common/src/utils/utils';
import { getLeaf, generateCommitment } from '../../../common/src/utils/pubkeyTree';

import { genMockPassportData } from '../../../common/src/utils/genMockPassportData';
import { formatInput } from '../../../common/src/utils/generateInputs';

describe('commitment hasher', function () {
  this.timeout(0);
  let circuit;

  this.beforeAll(async () => {
    const circuitPath = path.resolve(
      __dirname,
      '../../circuits/tests/utils/commitment_tester.circom'
    );
    circuit = await wasm_tester(circuitPath, {
      include: [
        'node_modules',
        './node_modules/@zk-kit/binary-merkle-root.circom/src',
        './node_modules/circomlib/circuits',
      ],
    });
  });
  describe('generate commitment', async () => {
    const passportData = genMockPassportData(
      'sha256',
      'sha256',
      'rsa_sha256_65537_2048',
      'FRA',
      '000101',
      '300101'
    );
    const formattedMrz = formatMrz(passportData.mrz);
    const dg2HashFormatted = formatDg2Hash(passportData.dg2Hash);
    const secret = 0;
    const attestation_id = 1;
    const leaf = getLeaf(passportData.dsc);
    const inputs = {
      secret: formatInput(secret),
      attestation_id: formatInput(attestation_id),
      leaf: formatInput(leaf),
      dg1: formatInput(formattedMrz),
      dg2_hash: dg2HashFormatted,
    };

    it('commitment from circuits should be equal to commitment from js', async () => {
      const witness = await circuit.calculateWitness(inputs, true);
      const leafValueCircom = (await circuit.getOutput(witness, ['out'])).out;
      console.log('\x1b[34m', 'hashValueCircom: ', leafValueCircom, '\x1b[0m');
      const mrz_bytes_packed = packBytes(formattedMrz);
      const commitment = generateCommitment(
        BigInt(secret).toString(),
        BigInt(attestation_id).toString(),
        BigInt(leaf).toString(),
        mrz_bytes_packed,
        dg2HashFormatted
      );
      console.log('\x1b[34m', 'commitment in js : ', commitment, '\x1b[0m');
      expect(BigInt(leafValueCircom).toString()).to.equal(BigInt(commitment).toString());
    });
  });
});
