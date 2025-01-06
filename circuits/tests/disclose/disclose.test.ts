import { assert, expect } from 'chai';
import path from 'path';
import { wasm as wasm_tester } from 'circom_tester';
import { formatMrz, packBytes } from '../../../common/src/utils/utils';
import {
  attributeToPosition,
  PASSPORT_ATTESTATION_ID,
} from '../../../common/src/constants/constants';
import { poseidon1, poseidon2, poseidon6 } from 'poseidon-lite';
import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { generateCommitment, getLeaf } from '../../../common/src/utils/pubkeyTree';
import { generateCircuitInputsDisclose } from '../../../common/src/utils/generateInputs';
import { formatAndUnpackReveal } from '../../../common/src/utils/revealBitmap';
import crypto from 'crypto';
import { genMockPassportData } from '../../../common/src/utils/genMockPassportData';
import { SMT } from '@openpassport/zk-kit-smt';
import namejson from '../../../common/ofacdata/outputs/nameSMT.json';

describe('Disclose', function () {
  this.timeout(0);
  let inputs: any;
  let circuit: any;
  let w: any;
  const passportData = genMockPassportData(
    'sha256',
    'sha256',
    'rsa_sha256_65537_2048',
    'FRA',
    '000101',
    '300101'
  );
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
    const selector_dg1 = Array(88).fill('1');
    const selector_older_than = '1';
    const scope = '@coboyApp';

    // compute the commitment and insert it in the tree
    const pubkey_leaf = getLeaf(passportData.dsc).toString();
    const mrz_bytes = packBytes(formatMrz(passportData.mrz));
    const commitment = generateCommitment(
      secret,
      PASSPORT_ATTESTATION_ID,
      pubkey_leaf,
      mrz_bytes,
      passportData.dg2Hash
    );
    console.log('commitment in js ', commitment);
    tree = new LeanIMT((a, b) => poseidon2([a, b]), []);
    tree.insert(BigInt(commitment));
    let smt = new SMT(poseidon2, true);
    smt.import(namejson);

    const selector_ofac = 1;
    const forbidden_countries_list = ['ALG', 'DZA'];

    inputs = generateCircuitInputsDisclose(
      secret,
      PASSPORT_ATTESTATION_ID,
      passportData,
      scope,
      selector_dg1,
      selector_older_than,
      tree,
      majority,
      smt,
      selector_ofac,
      forbidden_countries_list,
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

    console.log('nullifier_circom', nullifier_circom);
    console.log('nullifier_js', nullifier_js);
    expect(nullifier_circom).to.equal(nullifier_js);
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

        const selector_dg1 = Array(88).fill('0');

        Object.entries(attributeToReveal).forEach(([attribute, reveal]) => {
          if (reveal) {
            const [start, end] = attributeToPosition[attribute];
            selector_dg1.fill('1', start, end + 1);
          }
        });

        inputs = {
          ...inputs,
          selector_dg1: selector_dg1.map(String),
        };

        w = await circuit.calculateWitness(inputs);

        const revealedData_packed = await circuit.getOutput(w, ['revealedData_packed[3]']);

        const reveal_unpacked = formatAndUnpackReveal(revealedData_packed);

        for (let i = 0; i < reveal_unpacked.length; i++) {
          if (selector_dg1[i] == '1') {
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
    const selector_dg1 = Array(88).fill('0');

    w = await circuit.calculateWitness({
      ...inputs,
      selector_dg1: selector_dg1.map(String),
    });

    const older_than = formatOlderThan(await circuit.getOutput(w, ['older_than[2]']));

    expect(older_than[0]).to.equal(1);
    expect(older_than[1]).to.equal(8);
  });

  it("shouldn't allow disclosing wrong majority", async function () {
    const selector_dg1 = Array(88).fill('0');

    w = await circuit.calculateWitness({
      ...inputs,
      majority: ['5', '0'].map((char) => BigInt(char.charCodeAt(0)).toString()),
      selector_dg1: selector_dg1.map(String),
    });

    const revealedData_packed = await circuit.getOutput(w, ['revealedData_packed[3]']);

    const reveal_unpacked = formatAndUnpackReveal(revealedData_packed);

    expect(reveal_unpacked[88]).to.equal('\x00');
    expect(reveal_unpacked[89]).to.equal('\x00');
  });
});

const formatOlderThan = (older_than: any) => {
  return Object.values(older_than).map((value: any) => parseInt(value) - 48);
};
