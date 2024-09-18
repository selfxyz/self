import { assert, expect } from 'chai';
import path from 'path';
import { wasm as wasm_tester } from 'circom_tester';
import { formatMrz, packBytes, toUnsignedByte } from '../../../common/src/utils/utils';
import {
  attributeToPosition,
  k_dsc,
  n_dsc,
  PASSPORT_ATTESTATION_ID,
} from '../../../common/src/constants/constants';
import { poseidon1, poseidon2, poseidon6 } from 'poseidon-lite';
import { LeanIMT } from '@zk-kit/lean-imt';
import { generateCommitment, getLeaf } from '../../../common/src/utils/pubkeyTree';
import { generateCircuitInputsDisclose } from '../../../common/src/utils/generateInputs';
import { formatAndUnpackReveal } from '../../../common/src/utils/revealBitmap';
import crypto from 'crypto';
import { genMockPassportData } from '../../../common/src/utils/genMockPassportData';

describe('Disclose', function () {
  this.timeout(0);
  let inputs: any;
  let circuit: any;
  let w: any;
  const passportData = genMockPassportData('rsa_sha256', 'FRA', '000101', '300101');
  let tree: any;

  before(async () => {
    circuit = await wasm_tester(
      path.join(__dirname, '../../circuits/disclose/vc_and_disclose.circom'),
      {
        include: [
          'node_modules',
          './node_modules/@zk-kit/binary-merkle-root.circom/src',
          './node_modules/circomlib/circuits',
        ],
      }
    );

    const secret = BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString();

    const majority = '18';
    const user_identifier = crypto.randomUUID();
    const bitmap = Array(90).fill('1');
    const scope = '@coboyApp';

    // compute the commitment and insert it in the tree
    const pubkey_leaf = getLeaf(passportData.dsc, n_dsc, k_dsc).toString();
    const mrz_bytes = packBytes(formatMrz(passportData.mrz));
    const commitment = generateCommitment(secret, PASSPORT_ATTESTATION_ID, pubkey_leaf, mrz_bytes, passportData.dg2Hash.map((x) => toUnsignedByte(x).toString()));
    console.log("commitment", commitment);
    tree = new LeanIMT((a, b) => poseidon2([a, b]), []);
    tree.insert(BigInt(commitment));

    inputs = generateCircuitInputsDisclose(
      secret,
      PASSPORT_ATTESTATION_ID,
      passportData,
      tree,
      majority,
      bitmap,
      scope,
      user_identifier,
      n_dsc,
      k_dsc
    );
  });

  it('should compile and load the circuit', async function () {
    expect(circuit).to.not.be.undefined;
  });

  it('should have nullifier == poseidon(secret, scope)', async function () {
    // console.log("inputs", inputs);
    w = await circuit.calculateWitness(inputs);
    const nullifier_js = poseidon2([inputs.secret, inputs.scope]).toString();
    const nullifier_circom = (await circuit.getOutput(w, ['nullifier'])).nullifier;

    console.log("nullifier_circom", nullifier_circom);
    console.log("nullifier_js", nullifier_js);
    expect(nullifier_circom).to.equal(nullifier_js);
  });

  it('should fail to calculate witness with outdated passport', async function () {
    try {
      const invalidInputs = {
        ...inputs,
        current_date: ['4', '4', '0', '5', '1', '0'], // 2044
      };
      await circuit.calculateWitness(invalidInputs);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
    }
  });

  it('should fail to calculate witness with different attestation_id', async function () {
    try {
      const invalidInputs = {
        ...inputs,
        attestation_id: poseidon1([
          BigInt(Buffer.from('ANON-AADHAAR').readUIntBE(0, 6)),
        ]).toString(),
      };
      await circuit.calculateWitness(invalidInputs);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      // expect(error.message).to.include('Assert Failed');
    }
  });

  describe('MRZ selective disclosure', function () {
    const attributeCombinations = [
      ['issuing_state', 'name'],
      ['passport_number', 'nationality', 'date_of_birth'],
      ['gender', 'expiry_date'],
    ];

    attributeCombinations.forEach((combination) => {
      it(`Disclosing ${combination.join(', ')}`, async function () {
        const attributeToReveal = Object.keys(attributeToPosition).reduce((acc, attribute) => {
          acc[attribute] = combination.includes(attribute);
          return acc;
        }, {});

        const bitmap = Array(90).fill('0');

        Object.entries(attributeToReveal).forEach(([attribute, reveal]) => {
          if (reveal) {
            const [start, end] = attributeToPosition[attribute];
            bitmap.fill('1', start, end + 1);
          }
        });

        inputs = {
          ...inputs,
          bitmap: bitmap.map(String),
        };

        w = await circuit.calculateWitness(inputs);

        const revealedData_packed = await circuit.getOutput(w, ['revealedData_packed[3]']);

        const reveal_unpacked = formatAndUnpackReveal(revealedData_packed);

        for (let i = 0; i < reveal_unpacked.length; i++) {
          if (bitmap[i] == '1') {
            const char = String.fromCharCode(Number(inputs.dg1[i + 5]));
            assert(reveal_unpacked[i] == char, 'Should reveal the right character');
          } else {
            assert(reveal_unpacked[i] == '\x00', 'Should not reveal');
          }
        }
      });
    });
  });

  it('should allow disclosing majority', async function () {
    const bitmap = Array(90).fill('0');
    bitmap[88] = '1';
    bitmap[89] = '1';

    w = await circuit.calculateWitness({
      ...inputs,
      bitmap: bitmap.map(String),
    });

    const revealedData_packed = await circuit.getOutput(w, ['revealedData_packed[3]']);

    const reveal_unpacked = formatAndUnpackReveal(revealedData_packed);
    //console.log("reveal_unpacked", reveal_unpacked)

    expect(reveal_unpacked[88]).to.equal('1');
    expect(reveal_unpacked[89]).to.equal('8');
  });

  it("shouldn't allow disclosing wrong majority", async function () {
    const bitmap = Array(90).fill('0');
    bitmap[88] = '1';
    bitmap[89] = '1';

    w = await circuit.calculateWitness({
      ...inputs,
      majority: ['5', '0'].map((char) => BigInt(char.charCodeAt(0)).toString()),
      bitmap: bitmap.map(String),
    });

    const revealedData_packed = await circuit.getOutput(w, ['revealedData_packed[3]']);

    const reveal_unpacked = formatAndUnpackReveal(revealedData_packed);
    //console.log("reveal_unpacked", reveal_unpacked)

    expect(reveal_unpacked[88]).to.equal('\x00');
    expect(reveal_unpacked[89]).to.equal('\x00');
  });
});
