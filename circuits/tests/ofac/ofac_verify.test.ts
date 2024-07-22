import { expect } from 'chai';
import path from 'path';
const wasm_tester = require('circom_tester').wasm;
import { mockPassportData_sha256_rsa_65537 } from '../../../common/src/constants/mockPassportData';
import {
  generateCircuitInputsOfac,
  generateCircuitInputsDisclose,
} from '../../../common/src/utils/generateInputs';
import { getLeaf } from '../../../common/src/utils/pubkeyTree';
import { SMT, ChildNodes } from '@ashpect/smt';
import { poseidon1, poseidon2, poseidon3, poseidon6 } from 'poseidon-lite';
import { LeanIMT } from '@zk-kit/lean-imt';
import { formatMrz, packBytes } from '../../../common/src/utils/utils';
import passportNojson from '../../../common/ofacdata/outputs/passportNoSMT.json';
import nameDobjson from '../../../common/ofacdata/outputs/nameDobSMT.json';
import namejson from '../../../common/ofacdata/outputs/nameSMT.json';

let circuit: any;
let passportData = mockPassportData_sha256_rsa_65537; //Mock passport is added in ofac list to test circuits
let tree: any;
const hash = (childNodes: ChildNodes) =>
  childNodes.length === 2 ? poseidon2(childNodes) : poseidon3(childNodes);

// Calculating common validatidy inputs for all 3 ciruits
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
tree = new LeanIMT((a, b) => poseidon2([a, b]), []);
tree.insert(BigInt(commitment));

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

  before(async () => {
    circuit = await wasm_tester(
      path.join(__dirname, '../circuits/ofac_passportNo_verifier.circom'),
      {
        include: [
          'node_modules',
          './node_modules/@zk-kit/binary-merkle-root.circom/src',
          './node_modules/circomlib/circuits',
        ],
      }
    );

    passno_smt.import(passportNojson);
    let proofLevel = 3;
    smt_inputs = generateCircuitInputsOfac(
      secret,
      attestation_id,
      passportData,
      tree,
      majority,
      bitmap,
      scope,
      user_identifier,
      passno_smt,
      proofLevel
    );
  });

  // Compile circuit
  it('should compile and load the circuit, level 3', async function () {
    expect(circuit).to.not.be.undefined;
  });

  // Correct path, but assertion of non-membership fails
  it('should fail to calculate witness with valid paths but failing non-membership assertion , level 3', async function () {
    try {
      await circuit.calculateWitness(smt_inputs);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
      expect(error.message).to.include('line: 52');
    }
  });

  // Incorrect path
  it('should fail to calculate witness with invalid paths , level 3', async function () {
    try {
      let inputs = smt_inputs;
      inputs.smt_path[0] = inputs.smt_path[0] ^ 1; //flips the first bit to create an invalid path
      await circuit.calculateWitness(inputs);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
      expect(error.message).to.include('line: 44');
    }
  });
});

describe('start testing ofac_nameDob_verifier.circom', function () {
  this.timeout(0);
  let namedob_smt = new SMT(hash, true);
  let smt_inputs: any;

  before(async () => {
    circuit = await wasm_tester(path.join(__dirname, '../circuits/ofac_nameDob_verifier.circom'), {
      include: [
        'node_modules',
        './node_modules/@zk-kit/binary-merkle-root.circom/src',
        './node_modules/circomlib/circuits',
      ],
    });

    namedob_smt.import(nameDobjson);
    let proofLevel = 2;
    smt_inputs = generateCircuitInputsOfac(
      secret,
      attestation_id,
      passportData,
      tree,
      majority,
      bitmap,
      scope,
      user_identifier,
      namedob_smt,
      proofLevel
    );
  });

  // Compile circuit
  it('should compile and load the circuit, level 2', async function () {
    expect(circuit).to.not.be.undefined;
  });

  // Correct path, but assertion of non-membership fails
  it('should fail to calculate witness with valid paths but failing non-membership assertion , level 2', async function () {
    try {
      await circuit.calculateWitness(smt_inputs);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
      expect(error.message).to.include('line: 59');
    }
  });

  // Incorrect path
  it('should fail to calculate witness with invalid paths , level 2', async function () {
    try {
      let inputs = smt_inputs;
      inputs.smt_path[0] = inputs.smt_path[0] ^ 1; //flips the first bit to create an invalid path
      await circuit.calculateWitness(inputs);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
      expect(error.message).to.include('line: 56');
    }
  });
});

describe('start testing ofac_name_verifier.circom', function () {
  this.timeout(0);
  let name_smt = new SMT(hash, true);
  let smt_inputs: any;

  before(async () => {
    circuit = await wasm_tester(path.join(__dirname, '../circuits/ofac_name_verifier.circom'), {
      include: [
        'node_modules',
        './node_modules/@zk-kit/binary-merkle-root.circom/src',
        './node_modules/circomlib/circuits',
      ],
    });

    name_smt.import(namejson);
    let proofLevel = 1;
    smt_inputs = generateCircuitInputsOfac(
      secret,
      attestation_id,
      passportData,
      tree,
      majority,
      bitmap,
      scope,
      user_identifier,
      name_smt,
      proofLevel
    );
  });

  // Compile circuit
  it('should compile and load the circuit, level 1', async function () {
    expect(circuit).to.not.be.undefined;
  });

  // Correct path, but assertion of non-membership fails
  it('should fail to calculate witness with valid paths but failing non-membership assertion , level 1', async function () {
    try {
      await circuit.calculateWitness(smt_inputs);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
      expect(error.message).to.include('line: 48');
    }
  });

  // Incorrect path
  it('should fail to calculate witness with invalid paths , level 1', async function () {
    try {
      let inputs = smt_inputs;
      inputs.smt_path[0] = inputs.smt_path[0] ^ 1;
      await circuit.calculateWitness(inputs);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
      expect(error.message).to.include('line: 45');
    }
  });
});
