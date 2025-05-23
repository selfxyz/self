// eslint-disable-next-line @typescript-eslint/no-var-requires
const circom_tester = require('circom_tester/wasm/tester');

import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import dotenv from 'dotenv';
import { describe } from 'mocha';
import { assert, expect } from 'chai';
import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { SMT } from '@openpassport/zk-kit-smt';
import { poseidon1, poseidon2 } from 'poseidon-lite';
import nameAndDobjson from '../../../common/ofacdata/outputs/nameAndDobSMT_Aadhaar.json';
import nameAndYobjson from '../../../common/ofacdata/outputs/nameAndYobSMT_Aadhaar.json'


import { generateCircuitInputsAadhaarVCandDisclose, generateCommitmentAadhaar, prepareTestData } from '../../../common/src/utils/aadhaar/aadhaar';

dotenv.config();

describe('Disclose_aadhaar', function () {
  this.timeout(0);

  let circuit: any;
  before(async () => {
    circuit = await circom_tester(
      path.join(__dirname, '../../circuits/disclose/aadhar_vc_and_disclose.circom'),
      {
        include: [
          'node_modules',
          './node_modules/@zk-kit/binary-merkle-root.circom/src',
          './node_modules/circomlib/circuits',
        ],
      }
    );
  });

  it('should compile and load the circuit', async function () {
    const secret = BigInt(0);
    const attestationId = BigInt(3); //for aadhaar

    const {
      inputs: regInputs,
      qrDataPadded,
      qrDataPaddedLen,
      delimiterIndices,
    } = prepareTestData();
    const tree = new LeanIMT((a, b) => poseidon2([a, b]), []);
    const commitment = await generateCommitmentAadhaar(secret, attestationId, qrDataPadded);
    tree.insert(commitment);

    const nameDobSMT = new SMT(poseidon2, true);

    nameDobSMT.import(nameAndDobjson);

    const nameYobSMT = new SMT(poseidon2, true);

    nameYobSMT.import(nameAndYobjson);
    const userId = crypto.randomUUID();
    const inputs = await generateCircuitInputsAadhaarVCandDisclose(
      tree,
      nameDobSMT,
      nameYobSMT,
      userId,
      {
        selectors: {
          revealAge: true,
          revealGender: true,
          revealPin: true,
          revealState: true,
          selectorOfac: true,
        },
        majorityYears: 18,
        scope: '1',
        userIdentifier: userId,
        // now: new Date("2025-12-01T00:00:00Z"), // override date if you like
      }
    );
    await circuit.calculateWitness(inputs);
    console.log("Circuit witness calc done");
  });

//   it('should have nullifier == poseidon(secret, scope)', async function () {
//     // w = await circuit.calculateWitness(inputs);
//     // const nullifier_js = poseidon2([inputs.secret, inputs.scope]).toString();
//     // const nullifier_circom = (await circuit.getOutput(w, ['nullifier'])).nullifier;

//     // console.log('nullifier_circom', nullifier_circom);
//     // console.log('nullifier_js', nullifier_js);
//     // expect(nullifier_circom).to.equal(nullifier_js);
//   });

//   it('should fail to calculate witness with different attestation_id', async function () {
//     // try {
//     //   const invalidInputs = {
//     //     ...inputs,
//     //     attestation_id: poseidon1([
//     //       BigInt(Buffer.from('ANON-AADHAAR').readUIntBE(0, 6)),
//     //     ]).toString(),
//     //   };
//     //   await circuit.calculateWitness(invalidInputs);
//     //   expect.fail('Expected an error but none was thrown.');
//     // } catch (error) {
//     //   // expect(error.message).to.include('Assert Failed');
//     // }
//   });

//   describe('selective disclosure ', function (){
//     // set the combinations
//     const attributeCombinations = [
//       ['issuing_state', 'name'],
//       ['passport_number', 'nationality', 'date_of_birth'],
//       ['gender', 'expiry_date'],
//     ];

//     // attributeCombinations.forEach((combination) => {
//     //   it(`Disclosing ${combination.join(', ')}`, async function () {
//     //     const attributeToReveal = Object.keys(attributeToPosition).reduce((acc, attribute) => {
//     //       acc[attribute] = combination.includes(attribute);
//     //       return acc;
//     //     }, {});

//     //     const selector_dg1 = Array(88).fill('0');

//     //     Object.entries(attributeToReveal).forEach(([attribute, reveal]) => {
//     //       if (reveal) {
//     //         const [start, end] = attributeToPosition[attribute];
//     //         selector_dg1.fill('1', start, end + 1);
//     //       }
//     //     });

//     //     inputs = {
//     //       ...inputs,
//     //       selector_dg1: selector_dg1.map(String),
//     //     };

//     //     w = await circuit.calculateWitness(inputs);

//     //     const revealedData_packed = await circuit.getOutput(w, ['revealedData_packed[3]']);

//     //     const reveal_unpacked = formatAndUnpackReveal(revealedData_packed);

//     //     for (let i = 0; i < 88; i++) {
//     //       if (selector_dg1[i] == '1') {
//     //         const char = String.fromCharCode(Number(inputs.dg1[i + 5]));
//     //         assert(reveal_unpacked[i] == char, 'Should reveal the right character');
//     //       } else {
//     //         assert(reveal_unpacked[i] == '\x00', 'Should not reveal');
//     //       }
//     //     }

//     //     const forbidden_countries_list_packed = await circuit.getOutput(w, [
//     //       'forbidden_countries_list_packed[1]',
//     //     ]);
//     //     const forbidden_countries_list_unpacked = formatAndUnpackForbiddenCountriesList(
//     //       forbidden_countries_list_packed
//     //     );
//     //     expect(forbidden_countries_list_unpacked).to.deep.equal(forbidden_countries_list);
//     //   });
//     // });

//   });

//   describe('majority disclose',function(){
//     // it('should allow disclosing majority ',async function (){

//     // })

//     // it("shouldn't allow disclosing wrong majority", async function () {
//     //   const selector_dg1 = Array(88).fill('0');

//     //   w = await circuit.calculateWitness({
//     //     ...inputs,
//     //     majority: ['5', '0'].map((char) => BigInt(char.charCodeAt(0)).toString()),
//     //     selector_dg1: selector_dg1.map(String),
//     //   };
//   })

//   // describe('OFAC disclosure', function () {
//   //   it('should allow disclosing OFAC check result when selector is 1', async function () {
//   //     w = await circuit.calculateWitness(inputs);

//   //     const revealedData_packed = await circuit.getOutput(w, ['revealedData_packed[3]']);
//   //     const reveal_unpacked = formatAndUnpackReveal(revealedData_packed);

//   //     console.log('reveal_unpacked', reveal_unpacked);
//   //     // OFAC result is stored at index 90 in the revealed data
//   //     const ofac_results = reveal_unpacked.slice(90, 93);

//   //     console.log('ofac_results', ofac_results);

//   //     expect(ofac_results).to.deep.equal(
//   //       ['\x01', '\x01', '\x01'],
//   //       'OFAC result bits should be [1, 1, 1]'
//   //     );
//   //     expect(ofac_results).to.not.equal(['\x00', '\x00', '\x00'], 'OFAC result should be revealed');
//   //   });

//   // it('should not disclose OFAC check result when selector is 0', async function () {
//   //   w = await circuit.calculateWitness({
//   //     ...inputs,
//   //     selector_ofac: '0',
//   //   });

//   //   const revealedData_packed = await circuit.getOutput(w, ['revealedData_packed[3]']);
//   //   const reveal_unpacked = formatAndUnpackReveal(revealedData_packed);

//   //   // OFAC result should be hidden (null byte)
//   //   const ofac_result = reveal_unpacked[90];
//   //   expect(ofac_result).to.equal('\x00', 'OFAC result should not be revealed');
//   // });

  // it('should show different levels of OFAC matching', async function () {})
});
