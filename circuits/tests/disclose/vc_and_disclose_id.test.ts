import { describe } from 'mocha';
import { assert, expect } from 'chai';
import path from 'path';
import { wasm as wasm_tester } from 'circom_tester';
import {
  attributeToPosition_ID,
  ID_CARD_ATTESTATION_ID,
} from '@selfxyz/common/constants/constants';
import { poseidon2 } from 'poseidon-lite';
import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { generateCircuitInputsVCandDisclose } from '@selfxyz/common/utils/circuits/generateInputs';
import crypto from 'crypto';
import { SMT } from '@openpassport/zk-kit-smt';
import nameAndDobjson from '../consts/ofac/nameAndDobSMT_ID.json' with { type: 'json' };
import nameAndYobjson from '../consts/ofac/nameAndYobSMT_ID.json' with { type: 'json' };
import {
  formatAndUnpackForbiddenCountriesList,
  formatAndUnpackReveal,
  getAttributeFromUnpackedReveal,
} from '@selfxyz/common/utils/circuits/formatOutputs';
import { generateCommitment } from '@selfxyz/common/utils/passports/passport';
import { hashEndpointWithScope } from '@selfxyz/common/utils/scope';
import { genMockIdDocAndInitDataParsing } from '@selfxyz/common/utils/passports/genMockIdDoc';
import { fileURLToPath } from 'url';
import { castFromUUID } from '@selfxyz/common/utils/circuits/uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Disclose', function () {
  this.timeout(0);
  let inputs: any;
  let circuit: any;
  let w: any;
  const passportData = genMockIdDocAndInitDataParsing({
    idType: 'mock_id_card',
  });
  console.log(passportData.mrz);
  const forbidden_countries_list = ['ALG', 'DZA'];

  const secret = BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString();
  const majority = '18';
  const user_identifier = castFromUUID(crypto.randomUUID());
  const selector_dg1 = Array(90).fill('1');
  const selector_older_than = '1';
  const endpoint = 'https://example.com';
  const scope = 'scope';
  const fullScope = hashEndpointWithScope(endpoint, scope);
  const attestation_id = ID_CARD_ATTESTATION_ID;

  // compute the commitment and insert it in the tree
  const commitment = generateCommitment(secret, attestation_id, passportData);
  console.log('commitment in js ', commitment);
  const tree: any = new LeanIMT((a, b) => poseidon2([a, b]), []);
  tree.insert(BigInt(commitment));

  const nameAndDob_smt = new SMT(poseidon2, true);
  nameAndDob_smt.import(nameAndDobjson);

  const nameAndYob_smt = new SMT(poseidon2, true);
  nameAndYob_smt.import(nameAndYobjson);

  const selector_ofac = 1;

  before(async () => {
    circuit = await wasm_tester(
      path.join(__dirname, '../../circuits/disclose/vc_and_disclose_id.circom'),
      {
        include: [
          'node_modules',
          'node_modules/@zk-kit/binary-merkle-root.circom/src',
          'node_modules/circomlib/circuits',
        ],
      }
    );

    inputs = generateCircuitInputsVCandDisclose(
      secret,
      ID_CARD_ATTESTATION_ID,
      passportData,
      fullScope,
      selector_dg1,
      selector_older_than,
      tree,
      majority,
      null,
      nameAndDob_smt,
      nameAndYob_smt,
      selector_ofac,
      forbidden_countries_list,
      user_identifier
    );
  });

  // it('should compile and load the circuit', async function () {
  //     expect(circuit).to.not.be.undefined;
  // });

  it('should have nullifier == poseidon(secret, scope)', async function () {
    w = await circuit.calculateWitness(inputs);
    const nullifier_js = poseidon2([inputs.secret, inputs.scope]).toString();
    const nullifier_circom = (await circuit.getOutput(w, ['nullifier'])).nullifier;

    console.log('nullifier_circom', nullifier_circom);
    console.log('nullifier_js', nullifier_js);
    expect(nullifier_circom).to.equal(nullifier_js);
  });

  describe('MRZ selective disclosure', function () {
    const attributeCombinations = [
      ['issuing_state', 'name'],
      ['passport_number', 'nationality', 'date_of_birth'],
      ['gender', 'expiry_date'],
    ];

    attributeCombinations.forEach((combination) => {
      it(`Disclosing ${combination.join(', ')}`, async function () {
        const attributeToReveal = Object.keys(attributeToPosition_ID).reduce((acc, attribute) => {
          acc[attribute] = combination.includes(attribute);
          return acc;
        }, {});

        const selector_dg1 = Array(90).fill('0');

        Object.entries(attributeToReveal).forEach(([attribute, reveal]) => {
          if (reveal) {
            const [start, end] = attributeToPosition_ID[attribute];
            selector_dg1.fill('1', start, end + 1);
          }
        });

        inputs = {
          ...inputs,
          selector_dg1: selector_dg1.map(String),
        };

        w = await circuit.calculateWitness(inputs);

        const revealedData_packed = await circuit.getOutput(w, ['revealedData_packed[4]']);
        const reveal_unpacked = formatAndUnpackReveal(revealedData_packed, 'id');

        for (let i = 0; i < 90; i++) {
          if (selector_dg1[i] == '1') {
            const char = String.fromCharCode(Number(inputs.dg1[i + 5]));
            assert(reveal_unpacked[i] == char, 'Should reveal the right character');
          } else {
            assert(reveal_unpacked[i] == '\x00', 'Should not reveal');
          }
        }

        const forbidden_countries_list_packed = await circuit.getOutput(w, [
          'forbidden_countries_list_packed[4]',
        ]);
        const forbidden_countries_list_unpacked = formatAndUnpackForbiddenCountriesList(
          forbidden_countries_list_packed
        );
        expect(forbidden_countries_list_unpacked).to.deep.equal(forbidden_countries_list);
      });
    });
  });

  it('should allow disclosing majority', async function () {
    const selector_dg1 = Array(90).fill('0');

    w = await circuit.calculateWitness({
      ...inputs,
      selector_dg1: selector_dg1.map(String),
    });
    const revealedData_packed = await circuit.getOutput(w, ['revealedData_packed[4]']);

    const reveal_unpacked = formatAndUnpackReveal(revealedData_packed, 'id');
    const older_than = getAttributeFromUnpackedReveal(reveal_unpacked, 'older_than', 'id');
    expect(older_than).to.equal('18');
  });

  it("shouldn't allow disclosing wrong majority", async function () {
    const selector_dg1 = Array(90).fill('0');

    w = await circuit.calculateWitness({
      ...inputs,
      majority: ['5', '0'].map((char) => BigInt(char.charCodeAt(0)).toString()),
      selector_dg1: selector_dg1.map(String),
    });

    const revealedData_packed = await circuit.getOutput(w, ['revealedData_packed[4]']);

    const reveal_unpacked = formatAndUnpackReveal(revealedData_packed, 'id');
    expect(reveal_unpacked[90]).to.equal('\x00');
    expect(reveal_unpacked[91]).to.equal('\x00');
  });

  describe('OFAC disclosure', function () {
    it('should allow disclosing OFAC check result when selector is 1', async function () {
      w = await circuit.calculateWitness(inputs);
      const revealedData_packed = await circuit.getOutput(w, ['revealedData_packed[4]']);
      const reveal_unpacked = formatAndUnpackReveal(revealedData_packed, 'id');
      const ofac_results = reveal_unpacked.slice(92, 94);
      expect(ofac_results).to.deep.equal(['\x01', '\x01'], 'OFAC result bits should be [1, 1]');
      expect(ofac_results).to.not.equal(['\x00', '\x00'], 'OFAC result should be revealed');
    });

    it('should not disclose OFAC check result when selector is 0', async function () {
      w = await circuit.calculateWitness({
        ...inputs,
        selector_ofac: '0',
      });

      const revealedData_packed = await circuit.getOutput(w, ['revealedData_packed[4]']);
      const reveal_unpacked = formatAndUnpackReveal(revealedData_packed, 'id');

      // OFAC result should be hidden (null byte)
      const ofac_results = reveal_unpacked.slice(92, 94);
      expect(ofac_results).to.deep.equal(['\x00', '\x00'], 'OFAC result bits should be [0, 0]');
      expect(ofac_results).to.not.equal(['\x01', '\x01'], 'OFAC result should not be revealed');
    });

    it('should show different levels of OFAC matching', async function () {
      // Test cases for different matching scenarios
      const testCases = [
        {
          desc: 'No details match',
          data: genMockIdDocAndInitDataParsing({ idType: 'mock_id_card' }),
          expectedBits: ['\x01', '\x01'],
        },
        {
          desc: 'Name and DOB matches (so YOB matches too)',
          data: genMockIdDocAndInitDataParsing({
            idType: 'mock_id_card',
            passportNumber: 'DIF123456',
            lastName: 'HENAO MONTOYA',
            firstName: 'ARCANGEL DE JESUS',
            birthDate: '541007',
            expiryDate: '300101',
          }),
          expectedBits: ['\x00', '\x00'],
        },
        {
          desc: 'Only name and YOB match',
          data: genMockIdDocAndInitDataParsing({
            idType: 'mock_id_card',
            passportNumber: 'DIF123456',
            lastName: 'HENAO MONTOYA',
            firstName: 'ARCANGEL DE JESUS',
            birthDate: '541299',
            expiryDate: '300101', // Same year (54) different month/day
          }),
          expectedBits: ['\x01', '\x00'],
        },
      ];

      for (const testCase of testCases) {
        console.log(`Testing: ${testCase.desc}`);
        const passportData = testCase.data;
        const sanctionedCommitment = generateCommitment(
          secret,
          ID_CARD_ATTESTATION_ID,
          passportData
        );
        tree.insert(BigInt(sanctionedCommitment));

        const testInputs = generateCircuitInputsVCandDisclose(
          secret,
          ID_CARD_ATTESTATION_ID,
          passportData,
          fullScope,
          Array(90).fill('0'), // selector_dg1
          selector_older_than,
          tree,
          majority,
          null,
          nameAndDob_smt,
          nameAndYob_smt,
          '1', // selector_ofac
          forbidden_countries_list,
          user_identifier
        );

        w = await circuit.calculateWitness(testInputs);
        const revealedData_packed = await circuit.getOutput(w, ['revealedData_packed[4]']);
        const reveal_unpacked = formatAndUnpackReveal(revealedData_packed, 'id');
        const ofac_results = reveal_unpacked.slice(92, 94);

        console.log(`${testCase.desc} - OFAC bits:`, ofac_results);
        expect(ofac_results).to.deep.equal(
          testCase.expectedBits,
          `Failed matching pattern for: ${testCase.desc}`
        );
      }
    });
  });
});
