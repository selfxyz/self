import { expect } from 'chai';
import path from 'path';
const wasm_tester = require('circom_tester').wasm;
import {
  mockPassportData_sha256_rsa_65537,
  mockPassportData2_sha256_rsa_65537,
} from '../../../common/src/constants/mockPassportData';
import { generateCircuitInputsOfac } from '../../../common/src/utils/generateInputs';
import { getLeaf } from '../../../common/src/utils/pubkeyTree';
import { SMT, ChildNodes } from '@ashpect/smt';
import { poseidon1, poseidon2, poseidon3, poseidon6 } from 'poseidon-lite';
import { LeanIMT } from '@zk-kit/lean-imt';
import { formatMrz, packBytes } from '../../../common/src/utils/utils';
import passportNojson from '../../../common/ofacdata/outputs/passportNoSMT.json';
import nameDobjson from '../../../common/ofacdata/outputs/nameDobSMT.json';
import namejson from '../../../common/ofacdata/outputs/nameSMT.json';
import { PassportData } from '../../../common/src/utils/types';
import { get } from 'http';

let circuit: any;
let passportData = mockPassportData_sha256_rsa_65537; //Mock passport is ADDED in ofac list to test circuits
let passportData2 = mockPassportData2_sha256_rsa_65537; //Mock passport is not added in ofac list to test circuits
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

  const majority = ['1', '8'];
  const user_identifier = '0xE6E4b6a802F2e0aeE5676f6010e0AF5C9CDd0a50';
  const bitmap = Array(90).fill('1');
  const scope = poseidon1([BigInt(Buffer.from('VOTEEEEE').readUIntBE(0, 6))]).toString();

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

  return {
    secret: secret,
    attestation_id: attestation_id,
    passportData: passportData,
    commitment: commitment,
    majority: majority,
    bitmap: bitmap,
    scope: scope,
    user_identifier: user_identifier,
  };
}
const inputs = getPassportInputs(passportData);
const mockInputs = getPassportInputs(passportData2);

tree = new LeanIMT((a, b) => poseidon2([a, b]), []);
tree.insert(BigInt(inputs.commitment));
tree.insert(BigInt(mockInputs.commitment));

// POSSIBLE TESTS (for each of 3 circuits) :
// 0. Cicuits compiles and loads
// 1. Invalid proof : (incorrect path of siblings, i.e computed root doesn't match)
// 2. Invalid proof : (correct path) and membership (leaf = calulated leaf) - assertion of non-membership would fail
// 3. Invalid proof : (correct path) and non-membership (leaf != calulated leaf) but correct proof of closest sibling fails
// 4. Valid proof  : (correct path) and non-membership (leaf != calulated leaf) AND correct proof of closest sibling passes

describe('start testing ofac_passportNo_verifier.circom', function () {
  this.timeout(0);
  let passno_smt = new SMT(hash, true);
  let smt_inputs: any;
  let smt_mockInputs: any;
  let random_input: any;

  before(async () => {
    circuit = await wasm_tester(
      path.join(__dirname, '../../circuits/ofac/ofac_passportNo_verifier.circom'),
      {
        include: [
          'node_modules',
          './node_modules/@zk-kit/binary-merkle-root.circom/src',
          './node_modules/circomlib/circuits',
        ],
      }
    );

    passno_smt.import(passportNojson);
    const proofLevel = 3;
    smt_inputs = generateCircuitInputsOfac(
      inputs.secret,
      inputs.attestation_id,
      inputs.passportData,
      tree,
      inputs.majority,
      inputs.bitmap,
      inputs.scope,
      inputs.user_identifier,
      passno_smt,
      proofLevel
    );

    smt_mockInputs = generateCircuitInputsOfac(
      mockInputs.secret,
      mockInputs.attestation_id,
      mockInputs.passportData,
      tree,
      mockInputs.majority,
      mockInputs.bitmap,
      mockInputs.scope,
      mockInputs.user_identifier,
      passno_smt,
      proofLevel
    );

    random_input = {
      secret: smt_inputs.secret,
      attestation_id: smt_inputs.attestation_id,
      pubkey_leaf: smt_inputs.pubkey_leaf,
      mrz: smt_inputs.mrz,
      merkle_root: smt_inputs.merkle_root,
      merkletree_size: smt_inputs.merkletree_size,
      path: smt_inputs.path,
      siblings: smt_inputs.siblings,
      current_date: smt_inputs.current_date,
      closest_leaf: smt_mockInputs.closest_leaf,
      smt_root: smt_mockInputs.smt_root,
      smt_size: smt_mockInputs.smt_size,
      smt_path: smt_mockInputs.smt_path,
      smt_siblings: smt_mockInputs.smt_siblings,
      path_to_match: smt_mockInputs.path_to_match,
    };
  });

  // Compile circuit
  it('should compile and load the circuit, level 3', async function () {
    expect(circuit).to.not.be.undefined;
  });

  // Corrct path, assertion of non-membership passes and proof of closest sibling passes : Everything correct as a proof
  it('should pass without errors , all conditions satisfied', async function () {
    await circuit.calculateWitness(smt_mockInputs);
    console.log('Everything correct');
  });

  // Correct path, assertion of non-membership passes, but failing to prove closest sibling
  it('should fail to calculate witness with valid paths and valid non-membership assertion but not correct closest sibling , level 2', async function () {
    try {
      // Basically user gives a correct path and siblings from the tree but not of his passport, trying to fake non-membership from another passport
      await circuit.calculateWitness(random_input);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
      expect(error.message).to.include('line: 72');
      expect(error.message).to.not.include('line: 46');
      expect(error.message).to.not.include('line: 42');
    }
  });

  // Correct path, but assertion of non-membership fails
  it('should fail to calculate witness with valid paths but failing non-membership assertion , level 3', async function () {
    try {
      await circuit.calculateWitness(smt_inputs);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
      expect(error.message).to.include('line: 46');
      expect(error.message).to.not.include('line: 42');
    }
  });

  // Incorrect path
  it('should fail to calculate witness with invalid paths , level 3', async function () {
    try {
      let inputs = smt_inputs;
      inputs.smt_path[0] = (inputs.smt_path[0] ^ 1).toString(); //flips the first bit to create an invalid path
      await circuit.calculateWitness(inputs);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
      expect(error.message).to.include('line: 42');
    }
  });
});

describe('start testing ofac_nameDob_verifier.circom', function () {
  this.timeout(0);
  let nameDob_smt = new SMT(hash, true);
  let smt_inputs: any;
  let smt_mockInputs: any;
  let random_input: any;

  before(async () => {
    circuit = await wasm_tester(
      path.join(__dirname, '../../circuits/ofac/ofac_nameDob_verifier.circom'),
      {
        include: [
          'node_modules',
          './node_modules/@zk-kit/binary-merkle-root.circom/src',
          './node_modules/circomlib/circuits',
        ],
      }
    );

    nameDob_smt.import(nameDobjson);
    const proofLevel = 2;
    smt_inputs = generateCircuitInputsOfac(
      inputs.secret,
      inputs.attestation_id,
      inputs.passportData,
      tree,
      inputs.majority,
      inputs.bitmap,
      inputs.scope,
      inputs.user_identifier,
      nameDob_smt,
      proofLevel
    );

    smt_mockInputs = generateCircuitInputsOfac(
      mockInputs.secret,
      mockInputs.attestation_id,
      mockInputs.passportData,
      tree,
      mockInputs.majority,
      mockInputs.bitmap,
      mockInputs.scope,
      mockInputs.user_identifier,
      nameDob_smt,
      proofLevel
    );

    random_input = {
      secret: smt_inputs.secret,
      attestation_id: smt_inputs.attestation_id,
      pubkey_leaf: smt_inputs.pubkey_leaf,
      mrz: smt_inputs.mrz,
      merkle_root: smt_inputs.merkle_root,
      merkletree_size: smt_inputs.merkletree_size,
      path: smt_inputs.path,
      siblings: smt_inputs.siblings,
      current_date: smt_inputs.current_date,
      closest_leaf: smt_mockInputs.closest_leaf,
      smt_root: smt_mockInputs.smt_root,
      smt_size: smt_mockInputs.smt_size,
      smt_path: smt_mockInputs.smt_path,
      smt_siblings: smt_mockInputs.smt_siblings,
      path_to_match: smt_mockInputs.path_to_match,
    };
  });

  it('should compile and load the circuit, level 3', async function () {
    expect(circuit).to.not.be.undefined;
  });

  it('should pass without errors , all conditions satisfied', async function () {
    await circuit.calculateWitness(smt_mockInputs);
    console.log('Everything correct');
  });

  it('should fail to calculate witness with valid paths and valid non-membership assertion but not correct closest sibling , level 2', async function () {
    try {
      await circuit.calculateWitness(random_input);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
      expect(error.message).to.include('line: 69');
      expect(error.message).to.not.include('line: 56');
      expect(error.message).to.not.include('line: 53');
    }
  });

  it('should fail to calculate witness with valid paths but failing non-membership assertion , level 3', async function () {
    try {
      await circuit.calculateWitness(smt_inputs);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
      expect(error.message).to.include('line: 56');
      expect(error.message).to.not.include('line: 53');
    }
  });

  it('should fail to calculate witness with invalid paths , level ', async function () {
    try {
      let inputs = smt_inputs;
      inputs.smt_path[0] = (inputs.smt_path[0] ^ 1).toString();
      await circuit.calculateWitness(inputs);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
      expect(error.message).to.include('line: 53');
    }
  });
});

describe('start testing ofac_name_verifier.circom', function () {
  this.timeout(0);
  let name_smt = new SMT(hash, true);
  let smt_inputs: any;
  let smt_mockInputs: any;
  let random_input: any;

  before(async () => {
    circuit = await wasm_tester(
      path.join(__dirname, '../../circuits/ofac/ofac_name_verifier.circom'),
      {
        include: [
          'node_modules',
          './node_modules/@zk-kit/binary-merkle-root.circom/src',
          './node_modules/circomlib/circuits',
        ],
      }
    );

    name_smt.import(namejson);
    const proofLevel = 1;
    smt_inputs = generateCircuitInputsOfac(
      inputs.secret,
      inputs.attestation_id,
      inputs.passportData,
      tree,
      inputs.majority,
      inputs.bitmap,
      inputs.scope,
      inputs.user_identifier,
      name_smt,
      proofLevel
    );

    smt_mockInputs = generateCircuitInputsOfac(
      mockInputs.secret,
      mockInputs.attestation_id,
      mockInputs.passportData,
      tree,
      mockInputs.majority,
      mockInputs.bitmap,
      mockInputs.scope,
      mockInputs.user_identifier,
      name_smt,
      proofLevel
    );

    random_input = {
      secret: smt_inputs.secret,
      attestation_id: smt_inputs.attestation_id,
      pubkey_leaf: smt_inputs.pubkey_leaf,
      mrz: smt_inputs.mrz,
      merkle_root: smt_inputs.merkle_root,
      merkletree_size: smt_inputs.merkletree_size,
      path: smt_inputs.path,
      siblings: smt_inputs.siblings,
      current_date: smt_inputs.current_date,
      closest_leaf: smt_mockInputs.closest_leaf,
      smt_root: smt_mockInputs.smt_root,
      smt_size: smt_mockInputs.smt_size,
      smt_path: smt_mockInputs.smt_path,
      smt_siblings: smt_mockInputs.smt_siblings,
      path_to_match: smt_mockInputs.path_to_match,
    };
  });

  it('should compile and load the circuit, level 3', async function () {
    expect(circuit).to.not.be.undefined;
  });

  it('should pass without errors , all conditions satisfied', async function () {
    await circuit.calculateWitness(smt_mockInputs);
    console.log('Everything correct');
  });

  it('should fail to calculate witness with valid paths and valid non-membership assertion but not correct closest sibling , level 2', async function () {
    try {
      await circuit.calculateWitness(random_input);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
      expect(error.message).to.include('line: 60');
      expect(error.message).to.not.include('line: 47');
      expect(error.message).to.not.include('line: 44');
    }
  });

  it('should fail to calculate witness with valid paths but failing non-membership assertion , level 3', async function () {
    try {
      await circuit.calculateWitness(smt_inputs);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
      expect(error.message).to.include('line: 47');
      expect(error.message).to.not.include('line: 44');
    }
  });

  it('should fail to calculate witness with invalid paths , level ', async function () {
    try {
      let inputs = smt_inputs;
      inputs.smt_path[0] = (inputs.smt_path[0] ^ 1).toString();
      await circuit.calculateWitness(inputs);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
      expect(error.message).to.include('line: 44');
    }
  });
});
