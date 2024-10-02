import { expect } from 'chai';
import path from 'path';
import crypto from 'crypto';
const wasm_tester = require('circom_tester').wasm;
import { generateCircuitInputsCountryVerifier } from '../../../common/src/utils/generateInputs';
import { generateCommitment, getLeaf } from '../../../common/src/utils/pubkeyTree';
import { SMT, ChildNodes } from '@ashpect/smt';
import { poseidon1, poseidon2, poseidon3, poseidon6 } from 'poseidon-lite';
import { LeanIMT } from '@zk-kit/lean-imt';
import { formatDg2Hash, formatMrz, packBytes } from '../../../common/src/utils/utils';
import scSmtJson from '../../../common/sanctionedCountries/outputs/sc_SMT.json';
import { PassportData } from '../../../common/src/utils/types';
import { genMockPassportData } from '../../../common/src/utils/genMockPassportData';

let circuit: any;
let passportData = genMockPassportData('rsa_sha256', 'FRA', '010101', '300101'); // mockPassportData_sha256_rsa_65537; // Country is France which is not in us sanctioned list

let passportData2 = genMockPassportData('rsa_sha256', 'CUB', '010101', '300101'); //mockPassportData2_sha256_rsa_65537; // Country is Cuba which is in us sanctioned list
let tree: LeanIMT;
const hash = (childNodes: ChildNodes) =>
  childNodes.length === 2 ? poseidon2(childNodes) : poseidon3(childNodes);

describe('start testing country_verifier.circom', function () {
  this.timeout(0);
  let sc_smt = new SMT(hash, true);
  let memSmtInputs: any;
  let nonMemSmtInputs: any;

  before(async () => {
    circuit = await wasm_tester(
      path.join(__dirname, '../../circuits/tests/utils/proveCountryIsNotInList_tester.circom'),
      {
        include: [
          'node_modules',
          './node_modules/@zk-kit/binary-merkle-root.circom/src',
          './node_modules/circomlib/circuits',
        ],
      }
    );

    sc_smt.import(scSmtJson);

    nonMemSmtInputs = generateCircuitInputsCountryVerifier(
      // proof of membership, USA-FRA pair (FRA is not in USA sanctioned list)
      passportData,
      sc_smt
    );

    memSmtInputs = generateCircuitInputsCountryVerifier(
      // proof of non-membership, USA-CUB pair (CUB is in USA sanctioned list)
      passportData2,
      sc_smt
    );
  });

  // Compile circuit
  it('should compile and load the circuit', async function () {
    expect(circuit).to.not.be.undefined;
  });

  // Corrct siblings and closest leaf : Everything correct as a proof
  it('should pass without errors , all conditions satisfied', async function () {
    let w = await circuit.calculateWitness(nonMemSmtInputs);
    console.log('Everything correct, Valid proof of non-membership !!');
  });

  // Correct siblings but membership proof : Fail at proofType == 0(non-mem) assertion
  it('should fail to calculate witness since trying to generate membership proof', async function () {
    try {
      await circuit.calculateWitness(memSmtInputs);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
    }
  });

  // Give wrong closest leaf but correct siblings array : Fail of SMT Verification
  it('should fail to calculate witness due to wrong leaf provided', async function () {
    try {
      let wrongSibInputs = nonMemSmtInputs;
      const randomNumber = Math.floor(Math.random() * Math.pow(2, 254));
      wrongSibInputs.smt_leaf_value = BigInt(randomNumber).toString();
      await circuit.calculateWitness(wrongSibInputs);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
    }
  });
});
