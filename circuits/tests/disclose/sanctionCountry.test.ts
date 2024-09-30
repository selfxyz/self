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

// Calculating common validatidy inputs for all 3 ciruits
function getPassportInputs(passportData: PassportData) {
  const secret = BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString();
  const attestation_name = 'E-PASSPORT';
  const attestation_id = poseidon1([
    BigInt(Buffer.from(attestation_name).readUIntBE(0, 6)),
  ]).toString();

  const majority = '18';
  const user_identifier = crypto.randomUUID();
  const selector_dg1 = Array(88).fill('1');
  const selector_older_than = '1';
  const scope = 'sanctionCountryTest';

  const pubkey_leaf = getLeaf(passportData.dsc).toString();
  const mrz_bytes = packBytes(formatMrz(passportData.mrz));
  const commitment = generateCommitment(
    secret,
    attestation_id,
    pubkey_leaf,
    mrz_bytes,
    formatDg2Hash(passportData.dg2Hash)
  );

  return {
    secret: secret,
    attestation_id: attestation_id,
    passportData: passportData,
    commitment: commitment,
    majority: majority,
    selector_dg1,
    selector_older_than,
    scope: scope,
    user_identifier: user_identifier,
  };
}
const validInputs = getPassportInputs(passportData);
const invalidInputs = getPassportInputs(passportData2);

tree = new LeanIMT((a, b) => poseidon2([a, b]), []);
tree.insert(BigInt(validInputs.commitment));
tree.insert(BigInt(invalidInputs.commitment));

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
      validInputs.secret,
      validInputs.attestation_id,
      validInputs.passportData,
      tree,
      validInputs.majority,
      validInputs.selector_dg1,
      validInputs.selector_older_than,
      validInputs.scope,
      validInputs.user_identifier,
      sc_smt
    );

    memSmtInputs = generateCircuitInputsCountryVerifier(
      // proof of non-membership, USA-CUB pair (CUB is in USA sanctioned list)
      invalidInputs.secret,
      invalidInputs.attestation_id,
      invalidInputs.passportData,
      tree,
      invalidInputs.majority,
      invalidInputs.selector_dg1,
      invalidInputs.selector_older_than,
      invalidInputs.scope,
      invalidInputs.user_identifier,
      sc_smt
    );
  });

  // Compile circuit
  it('should compile and load the circuit', async function () {
    expect(circuit).to.not.be.undefined;
  });

  // Corrct siblings and closest leaf : Everything correct as a proof
  it('should pass without errors , all conditions satisfied', async function () {
    console.log(nonMemSmtInputs);
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
      expect(error.message).to.not.include('SMTVerify');
    }
  });

  // Give wrong closest leaf but correct siblings array : Fail of SMT Verification
  it('should fail to calculate witness due to wrong closest_leaf provided', async function () {
    try {
      let wrongSibInputs = nonMemSmtInputs;
      const randomNumber = Math.floor(Math.random() * Math.pow(2, 254));
      wrongSibInputs.closest_leaf = BigInt(randomNumber).toString();
      await circuit.calculateWitness(wrongSibInputs);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
      expect(error.message).to.include('SMTVerify');
    }
  });
});
