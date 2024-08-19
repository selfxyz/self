import { assert, expect } from 'chai';
import path from 'path';
const wasm_tester = require('circom_tester').wasm;
import { mockPassportData_sha256_rsa_65537 } from '../../../common/src/constants/mockPassportData';
import { formatMrz, packBytes } from '../../../common/src/utils/utils';
import {
  attributeToPosition,
  COMMITMENT_TREE_DEPTH,
} from '../../../common/src/constants/constants';
import { poseidon1, poseidon2, poseidon6 } from 'poseidon-lite';
import { LeanIMT } from '@zk-kit/lean-imt';
import { getLeaf } from '../../../common/src/utils/pubkeyTree';
import { generateCircuitInputsDisclose } from '../../../common/src/utils/generateInputs';
import { unpackReveal } from '../../../common/src/utils/revealBitmap';

describe('Disclose', function () {
  this.timeout(0);
  let inputs: any;
  let circuit: any;
  let w: any;
  let passportData = mockPassportData_sha256_rsa_65537;
  let attestation_id: string;
  let tree: any;
  const attestation_name = 'E-PASSPORT';

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
    attestation_id = poseidon1([BigInt(Buffer.from(attestation_name).readUIntBE(0, 6))]).toString();

    const majority = '18';
    const user_identifier = '0xE6E4b6a802F2e0aeE5676f6010e0AF5C9CDd0a50';
    const bitmap = Array(90).fill('1');
    const scope = poseidon1([BigInt(Buffer.from('VOTEEEEE').readUIntBE(0, 6))]).toString();

    // compute the commitment and insert it in the tree
    const pubkey_leaf = getLeaf({
      signatureAlgorithm: passportData.signatureAlgorithm,
      modulus: passportData.pubKey.modulus,
      exponent: passportData.pubKey.exponent,
    }).toString();
    const mrz_bytes = packBytes(formatMrz(passportData.mrz));
    const commitment = poseidon6([
      secret,
      attestation_id,
      pubkey_leaf,
      mrz_bytes[0],
      mrz_bytes[1],
      mrz_bytes[2],
    ]);
    tree = new LeanIMT((a, b) => poseidon2([a, b]), []);
    tree.insert(BigInt(commitment));

    inputs = generateCircuitInputsDisclose(
      secret,
      attestation_id,
      passportData,
      tree,
      majority,
      bitmap,
      scope,
      user_identifier
    );
  });

  it('should compile and load the circuit', async function () {
    expect(circuit).to.not.be.undefined;
  });

  it('should have nullifier == poseidon(secret, scope)', async function () {
    w = await circuit.calculateWitness(inputs);
    const nullifier_js = poseidon2([inputs.secret, inputs.scope]).toString();
    const nullifier_circom = (await circuit.getOutput(w, ['nullifier'])).nullifier;

    //console.log("nullifier_circom", nullifier_circom);
    //console.log("nullifier_js", nullifier_js);
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
      expect(error.message).to.include('Assert Failed');
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

        const reveal_unpacked = unpackReveal(revealedData_packed);

        for (let i = 0; i < reveal_unpacked.length; i++) {
          if (bitmap[i] == '1') {
            const char = String.fromCharCode(Number(inputs.mrz[i + 5]));
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

    const reveal_unpacked = unpackReveal(revealedData_packed);
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

    const reveal_unpacked = unpackReveal(revealedData_packed);
    //console.log("reveal_unpacked", reveal_unpacked)

    expect(reveal_unpacked[88]).to.equal('\x00');
    expect(reveal_unpacked[89]).to.equal('\x00');
  });
});
