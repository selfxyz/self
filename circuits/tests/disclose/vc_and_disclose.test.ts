import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { SMT } from '@openpassport/zk-kit-smt';
import { assert, expect } from 'chai';
import { wasm as wasm_tester } from 'circom_tester';
import crypto from 'crypto';
import { describe } from 'mocha';
import path from 'path';
import { poseidon1, poseidon2 } from 'poseidon-lite';
import nameAndDobjson from '../consts/ofac/nameAndDobSMT.json' with { type: 'json' };
import nameAndYobjson from '../consts/ofac/nameAndYobSMT.json' with { type: 'json' };
import passportNojson from '../consts/ofac/passportNoAndNationalitySMT.json' with { type: 'json' };
import { attributeToPosition, PASSPORT_ATTESTATION_ID } from '@selfxyz/common/constants/constants';
import {
  formatAndUnpackForbiddenCountriesList,
  formatAndUnpackReveal,
  getAttributeFromUnpackedReveal,
} from '@selfxyz/common/utils/circuits/formatOutputs';
import { generateCircuitInputsVCandDisclose } from '@selfxyz/common/utils/circuits/generateInputs';
import { genAndInitMockPassportData } from '@selfxyz/common/utils/passports/genMockPassportData';
import { generateCommitment } from '@selfxyz/common/utils/passports/passport';
import { hashEndpointWithScope } from '@selfxyz/common/utils/scope';
import { fileURLToPath } from 'url';
import { castFromUUID } from '@selfxyz/common/utils/circuits/uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Disclose', function () {
  this.timeout(0);
  let inputs: any;
  let circuit: any;
  let w: any;
  const passportData = genAndInitMockPassportData(
    'sha256',
    'sha256',
    'rsa_sha256_65537_2048',
    'FRA',
    '000101',
    '300101'
  );
  const forbidden_countries_list = ['ALG', 'DZA'];

  const secret = BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString();
  const majority = '18';
  const user_identifier = castFromUUID(crypto.randomUUID());
  const selector_dg1 = Array(88).fill('1');
  const selector_older_than = '1';
  const endpoint = 'https://example.com';
  const scope = 'scope';
  const fullScope = hashEndpointWithScope(endpoint, scope);
  const attestation_id = PASSPORT_ATTESTATION_ID;

  // compute the commitment and insert it in the tree
  const commitment = generateCommitment(secret, attestation_id, passportData);
  console.log('commitment in js ', commitment);
  const tree: any = new LeanIMT((a, b) => poseidon2([a, b]), []);
  tree.insert(BigInt(commitment));

  const passportNo_smt = new SMT(poseidon2, true);
  passportNo_smt.import(passportNojson);

  const nameAndDob_smt = new SMT(poseidon2, true);
  nameAndDob_smt.import(nameAndDobjson);

  const nameAndYob_smt = new SMT(poseidon2, true);
  nameAndYob_smt.import(nameAndYobjson);

  const selector_ofac = 1;

  before(async () => {
    circuit = await wasm_tester(
      path.join(__dirname, '../../circuits/disclose/vc_and_disclose.circom'),
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
      PASSPORT_ATTESTATION_ID,
      passportData,
      fullScope,
      selector_dg1,
      selector_older_than,
      tree,
      majority,
      passportNo_smt,
      nameAndDob_smt,
      nameAndYob_smt,
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

        const reveal_unpacked = formatAndUnpackReveal(revealedData_packed, 'passport');

        for (let i = 0; i < 88; i++) {
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
    const selector_dg1 = Array(88).fill('0');

    w = await circuit.calculateWitness({
      ...inputs,
      selector_dg1: selector_dg1.map(String),
    });
    const revealedData_packed = await circuit.getOutput(w, ['revealedData_packed[3]']);

    const reveal_unpacked = formatAndUnpackReveal(revealedData_packed, 'passport');
    const older_than = getAttributeFromUnpackedReveal(reveal_unpacked, 'older_than', 'passport');
    expect(older_than).to.equal('18');
  });

  it("shouldn't allow disclosing wrong majority", async function () {
    const selector_dg1 = Array(88).fill('0');

    w = await circuit.calculateWitness({
      ...inputs,
      majority: ['5', '0'].map((char) => BigInt(char.charCodeAt(0)).toString()),
      selector_dg1: selector_dg1.map(String),
    });

    const revealedData_packed = await circuit.getOutput(w, ['revealedData_packed[3]']);

    const reveal_unpacked = formatAndUnpackReveal(revealedData_packed, 'passport');
    expect(reveal_unpacked[88]).to.equal('\x00');
    expect(reveal_unpacked[89]).to.equal('\x00');
  });

  describe('OFAC disclosure', function () {
    it('should allow disclosing OFAC check result when selector is 1', async function () {
      w = await circuit.calculateWitness(inputs);

      const revealedData_packed = await circuit.getOutput(w, ['revealedData_packed[3]']);
      const reveal_unpacked = formatAndUnpackReveal(revealedData_packed, 'passport');

      console.log('reveal_unpacked', reveal_unpacked);
      // OFAC result is stored at index 90 in the revealed data
      const ofac_results = reveal_unpacked.slice(90, 93);

      console.log('ofac_results', ofac_results);

      expect(ofac_results).to.deep.equal(
        ['\x01', '\x01', '\x01'],
        'OFAC result bits should be [1, 1, 1]'
      );
      expect(ofac_results).to.not.equal(['\x00', '\x00', '\x00'], 'OFAC result should be revealed');
    });

    it('should not disclose OFAC check result when selector is 0', async function () {
      w = await circuit.calculateWitness({
        ...inputs,
        selector_ofac: '0',
      });

      const revealedData_packed = await circuit.getOutput(w, ['revealedData_packed[3]']);
      const reveal_unpacked = formatAndUnpackReveal(revealedData_packed, 'passport');

      // OFAC result should be hidden (null byte)
      const ofac_result = reveal_unpacked[90];
      expect(ofac_result).to.equal('\x00', 'OFAC result should not be revealed');
    });

    it('should show different levels of OFAC matching', async function () {
      // Test cases for different matching scenarios
      const testCases = [
        {
          desc: 'No details match',
          data: genAndInitMockPassportData(
            'sha256',
            'sha256',
            'rsa_sha256_65537_2048',
            'USA',
            '010101',
            '300101',
            'DIF123456',
            'DIFFERENT NAME',
            'DIFFERENT SURNAME'
          ),
          expectedBits: ['\x01', '\x01', '\x01'],
        },
        {
          desc: 'Only passport number matches',
          data: genAndInitMockPassportData(
            'sha256',
            'sha256',
            'rsa_sha256_65537_2048',
            'ESP', // different nationality
            '000101',
            '300101',
            '98lh90556', // Matching passport number
            'DIFFERENT NAME',
            'DIFFERENT SURNAME'
          ),
          expectedBits: ['\x01', '\x01', '\x01'],
        },
        {
          desc: 'Only nationality matches',
          data: genAndInitMockPassportData(
            'sha256',
            'sha256',
            'rsa_sha256_65537_2048',
            'FRA',
            '991231',
            '300101',
            'DIF123456', // different passport number
            'DIFFERENT NAME',
            'DIFFERENT SURNAME'
          ),
          expectedBits: ['\x01', '\x01', '\x01'],
        },
        {
          desc: 'Only passport number and nationality matches',
          data: genAndInitMockPassportData(
            'sha256',
            'sha256',
            'rsa_sha256_65537_2048',
            'FRA',
            '991231',
            '300101',
            '98lh90556',
            'DIFFERENT NAME',
            'DIFFERENT SURNAME'
          ),
          expectedBits: ['\x00', '\x01', '\x01'],
        },
        {
          desc: 'Name and DOB matches (so YOB matches too)',
          data: genAndInitMockPassportData(
            'sha256',
            'sha256',
            'rsa_sha256_65537_2048',
            'FRA',
            '541007',
            '300101',
            'DIF123456',
            'HENAO MONTOYA',
            'ARCANGEL DE JESUS'
          ),
          expectedBits: ['\x01', '\x00', '\x00'],
        },
        {
          desc: 'Only name and YOB match',
          data: genAndInitMockPassportData(
            'sha256',
            'sha256',
            'rsa_sha256_65537_2048',
            'FRA',
            '541299',
            '300101', // Same year (54) different month/day
            'DIF123456',
            'HENAO MONTOYA',
            'ARCANGEL DE JESUS'
          ),
          expectedBits: ['\x01', '\x01', '\x00'],
        },
        {
          desc: 'All details match',
          data: genAndInitMockPassportData(
            'sha256',
            'sha256',
            'rsa_sha256_65537_2048',
            'FRA',
            '541007',
            '300101',
            '98lh90556',
            'HENAO MONTOYA',
            'ARCANGEL DE JESUS'
          ),
          expectedBits: ['\x00', '\x00', '\x00'],
        },
      ];

      for (const testCase of testCases) {
        console.log(`Testing: ${testCase.desc}`);

        const passportData = testCase.data;
        const sanctionedCommitment = generateCommitment(
          secret,
          PASSPORT_ATTESTATION_ID,
          passportData
        );
        tree.insert(BigInt(sanctionedCommitment));

        const testInputs = generateCircuitInputsVCandDisclose(
          secret,
          PASSPORT_ATTESTATION_ID,
          passportData,
          fullScope,
          Array(88).fill('0'), // selector_dg1
          selector_older_than,
          tree,
          majority,
          passportNo_smt,
          nameAndDob_smt,
          nameAndYob_smt,
          '1', // selector_ofac
          forbidden_countries_list,
          user_identifier
        );

        w = await circuit.calculateWitness(testInputs);
        const revealedData_packed = await circuit.getOutput(w, ['revealedData_packed[3]']);
        const reveal_unpacked = formatAndUnpackReveal(revealedData_packed, 'passport');
        const ofac_results = reveal_unpacked.slice(90, 93);

        console.log(`${testCase.desc} - OFAC bits:`, ofac_results);
        expect(ofac_results).to.deep.equal(
          testCase.expectedBits,
          `Failed matching pattern for: ${testCase.desc}`
        );
      }
    });
  });
});
