import { SMT } from '@openpassport/zk-kit-smt';
import { expect } from 'chai';
import { wasm as wasm_tester } from 'circom_tester';
import path from 'path';
import { fileURLToPath } from 'url';
import { poseidon2 } from 'poseidon-lite';
import nameAndDobjson from '../consts/ofac/nameAndDobSMT.json' with { type: 'json' };
import nameAndYobjson from '../consts/ofac/nameAndYobSMT.json' with { type: 'json' };
import nameAndDobIdCardJson from '../consts/ofac/nameAndDobSMT_ID.json' with { type: 'json' };
import nameAndYobIdCardJson from '../consts/ofac/nameAndYobSMT_ID.json' with { type: 'json' };
import { genMockIdDoc } from '@selfxyz/common/utils/passports/genMockIdDoc';
import passportNoAndNationalityjson from '../consts/ofac/passportNoAndNationalitySMT.json' with { type: 'json' };
import { generateCircuitInputsOfac } from '@selfxyz/common/utils/circuits/generateInputs';
import { genAndInitMockPassportData } from '@selfxyz/common/utils/passports/genMockPassportData';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let circuit: any;

// Mock passport not added in ofac list
const mockIdData = genMockIdDoc({ idType: 'mock_passport' });
const passportData = genAndInitMockPassportData(
  'sha256',
  'sha256',
  'rsa_sha256_65537_2048',
  'FRA',
  '040211',
  '300101'
);
// Mock passport in ofac list
const passportDataInOfac = genAndInitMockPassportData(
  'sha256',
  'sha256',
  'rsa_sha256_65537_2048',
  'FRA',
  '541007',
  '300101',
  '98lh90556',
  'HENAO MONTOYA',
  'ARCANGEL DE JESUS'
);

const mockIdDataInOfac = genMockIdDoc({
  idType: 'mock_passport',
  nationality: 'FRA',
  birthDate: '541007',
  lastName: 'HENAO MONTOYA',
  passportNumber: '98lh90556',
  firstName: 'ARCANGEL DE JESUS',
});

// Mock ID Card not in OFAC list
const idCardData = genMockIdDoc({
  idType: 'mock_id_card',
});

// Mock ID Card in OFAC list
const idCardDataInOfac = genMockIdDoc({
  idType: 'mock_id_card',
  nationality: 'FRA',
  birthDate: '541007',
  firstName: 'ARCANGEL DE JESUS',
  lastName: 'HENAO MONTOYA',
});

// POSSIBLE TESTS (for each of 3 circuits):
// 0. Cicuits compiles and loads
// 1. Valid proof   : Correct path and corresponding closest leaf AND leaf != pasport_hash ; Valid prove of non-membership
// 2. Invalid proof : Correct path and corresponding closest leaf AND leaf == pasport_hash ; Valid prove of membership ; Hence non-membership proof would fail
// 3. Invalid proof : Correct path but wrong corresponding siblings ; fails due to calculatedRoot != smt_root

// Level 3: Passport number and Nationality match in OfacList
describe('OFAC - Passport number and Nationality match', function () {
  this.timeout(0);
  let passNoAndNationality_smt = new SMT(poseidon2, true);
  let memSmtInputs: any;
  let nonMemSmtInputs: any;

  before(async () => {
    circuit = await wasm_tester(
      path.join(__dirname, '../../circuits/tests/ofac/ofac_passport_number_tester.circom'),
      {
        include: [
          'node_modules',
          'node_modules/@zk-kit/binary-merkle-root.circom/src',
          'node_modules/circomlib/circuits',
        ],
      }
    );

    const proofLevel = 3;
    passNoAndNationality_smt.import(passportNoAndNationalityjson);
    memSmtInputs = generateCircuitInputsOfac(
      passportDataInOfac,
      passNoAndNationality_smt,
      proofLevel
    );

    nonMemSmtInputs = generateCircuitInputsOfac(passportData, passNoAndNationality_smt, proofLevel);
  });

  // Compile circuit
  it('should compile and load the circuit, level 3', async function () {
    expect(circuit).to.not.be.undefined;
  });

  // Correct siblings and closest leaf: Everything correct as a proof
  it('should pass without errors, all conditions satisfied', async function () {
    let w = await circuit.calculateWitness(nonMemSmtInputs);
    const ofacCheckResult = (await circuit.getOutput(w, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('1');
  });

  // Correct siblings but membership proof: Fail at line 43 assertion
  it('should pass - passport is in ofac list, level 3', async function () {
    let w = await circuit.calculateWitness(memSmtInputs);
    const ofacCheckResult = (await circuit.getOutput(w, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0');
  });

  // Give wrong closest leaf but correct siblings array: Fail of SMT Verification
  it('should pass - wrong merkleroot, level 3', async function () {
    const wrongInputs = {
      ...nonMemSmtInputs,
      smt_leaf_key: BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString(),
    };
    let w = await circuit.calculateWitness(wrongInputs);
    const ofacCheckResult = (await circuit.getOutput(w, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0');
  });
});

// Level 2: NameDob match in OfacList
describe('OFAC - Name and DOB match', function () {
  this.timeout(0);
  let namedob_smt = new SMT(poseidon2, true);
  let memSmtInputs: any;
  let nonMemSmtInputs: any;

  before(async () => {
    circuit = await wasm_tester(
      path.join(__dirname, '../../circuits/tests/ofac/ofac_name_dob_tester.circom'),
      {
        include: [
          'node_modules',
          'node_modules/@zk-kit/binary-merkle-root.circom/src',
          'node_modules/circomlib/circuits',
        ],
      }
    );

    namedob_smt.import(nameAndDobjson);
    const proofLevel = 2;
    memSmtInputs = generateCircuitInputsOfac(
      // proof of membership
      passportDataInOfac,
      namedob_smt,
      proofLevel
    );

    nonMemSmtInputs = generateCircuitInputsOfac(
      // proof of non-membership
      passportData,
      namedob_smt,
      proofLevel
    );
  });

  // // Compile circuit
  it('should compile and load the circuit, level 2', async function () {
    expect(circuit).to.not.be.undefined;
  });

  // Correct siblings and closest leaf : Everything correct as a proof
  it('should pass without errors, all conditions satisfied', async function () {
    let w = await circuit.calculateWitness(nonMemSmtInputs);
    const ofacCheckResult = (await circuit.getOutput(w, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('1');
  });

  // Correct siblings but membership proof : Fail at line 54 assertion
  it('should pass - passport is in ofac list, level 2', async function () {
    let w = await circuit.calculateWitness(memSmtInputs);
    const ofacCheckResult = (await circuit.getOutput(w, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0');
  });

  // Give wrong closest leaf but correct siblings array
  it('should pass - wrong merkleroot, level 2', async function () {
    const wrongInputs = {
      ...nonMemSmtInputs,
      smt_leaf_key: BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString(),
    };

    let w = await circuit.calculateWitness(wrongInputs);
    const ofacCheckResult = (await circuit.getOutput(w, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0');
  });
});

// Level 1: Name and YOB match in OfacList
describe('OFAC - Name and YOB match', function () {
  this.timeout(0);
  let name_smt = new SMT(poseidon2, true);
  let memSmtInputs: any;
  let nonMemSmtInputs: any;

  before(async () => {
    circuit = await wasm_tester(
      path.join(__dirname, '../../circuits/tests/ofac/ofac_name_yob_tester.circom'),
      {
        include: [
          'node_modules',
          'node_modules/@zk-kit/binary-merkle-root.circom/src',
          'node_modules/circomlib/circuits',
        ],
      }
    );

    name_smt.import(nameAndYobjson);
    const proofLevel = 1;
    memSmtInputs = generateCircuitInputsOfac(
      // proof of membership
      passportDataInOfac,
      name_smt,
      proofLevel
    );

    nonMemSmtInputs = generateCircuitInputsOfac(
      // proof of non-membership
      passportData,
      name_smt,
      proofLevel
    );
  });

  // Compile circuit
  it('should compile and load the circuit, level 1', async function () {
    expect(circuit).to.not.be.undefined;
  });

  // Correct siblings and closest leaf : Everything correct as a proof
  it('should pass without errors, all conditions satisfied', async function () {
    let w = await circuit.calculateWitness(nonMemSmtInputs);
    const ofacCheckResult = (await circuit.getOutput(w, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('1');
  });

  // Correct siblings but membership proof : Fail at line 46 assertion
  it('should pass - passport is in ofac list, level 1', async function () {
    let w = await circuit.calculateWitness(memSmtInputs);
    const ofacCheckResult = (await circuit.getOutput(w, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0');
  });

  // Give wrong closest leaf but correct siblings array
  it('should pass - wrong merkleroot, level 1', async function () {
    const wrongInputs = {
      ...nonMemSmtInputs,
      smt_leaf_key: BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString(),
    };
    let w = await circuit.calculateWitness(wrongInputs);
    const ofacCheckResult = (await circuit.getOutput(w, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0');
  });
});

describe('OFAC - SMT Security Tests', function () {
  this.timeout(0);
  let passNoAndNationality_smt = new SMT(poseidon2, true);
  let circuit: any;
  let baseInputs: any;

  before(async () => {
    circuit = await wasm_tester(
      path.join(__dirname, '../../circuits/tests/ofac/ofac_passport_number_tester.circom'),
      {
        include: [
          'node_modules',
          'node_modules/@zk-kit/binary-merkle-root.circom/src',
          'node_modules/circomlib/circuits',
        ],
      }
    );

    passNoAndNationality_smt.import(passportNoAndNationalityjson);
    const proofLevel = 3;
    baseInputs = generateCircuitInputsOfac(passportData, passNoAndNationality_smt, proofLevel);
  });

  it('should reject proof with invalid siblings length', async function () {
    const overflowInputs = {
      ...baseInputs,
      smt_siblings: Array(65)
        .fill('0')
        .map((x) => x.toString()), // More siblings than tree depth
    };

    try {
      await circuit.calculateWitness(overflowInputs);
      expect.fail('Should have thrown error');
    } catch (err) {
      expect(err.toString()).to.include('Too many values for input signal');
    }
  });

  it('should reject proof with malformed path bits', async function () {
    const malformedPathInputs = {
      ...baseInputs,
      // Modify one of the siblings to be an invalid value
      smt_siblings: baseInputs.smt_siblings.map((x: string, i: number) =>
        i === 0 ? '2'.repeat(254) : x
      ),
    };

    try {
      await circuit.calculateWitness(malformedPathInputs);
      expect.fail('Should have thrown error');
    } catch (err) {
      expect(err.toString()).to.include('Error');
    }
  });

  // Test against zero value attack
  it('should handle zero values in siblings array correctly', async function () {
    const zeroSiblingsInputs = {
      ...baseInputs,
      smt_siblings: Array(64)
        .fill('0')
        .map((x) => x.toString()),
    };

    let w = await circuit.calculateWitness(zeroSiblingsInputs);
    const ofacCheckResult = (await circuit.getOutput(w, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0');
  });

  // Test against incorrect tree height
  it('should reject proof with incorrect number of siblings', async function () {
    const wrongHeightInputs = {
      ...baseInputs,
      smt_siblings: baseInputs.smt_siblings.slice(0, 32), // Only half the siblings
    };

    try {
      await circuit.calculateWitness(wrongHeightInputs);
      expect.fail('Should have thrown error');
    } catch (err) {
      expect(err.toString()).to.include('Not enough values for input signal');
    }
  });

  // Test against invalid root
  it('should reject proof with invalid merkle root', async function () {
    const invalidRootInputs = {
      ...baseInputs,
      smt_root: (BigInt(baseInputs.smt_root) ^ 1n).toString(), // Modify smt_root by one bit
    };

    let w = await circuit.calculateWitness(invalidRootInputs);
    const ofacCheckResult = (await circuit.getOutput(w, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0');
  });
});

// ===========================
// ID Card Tests
// ===========================

// Level 2: NameDob match in OfacList - ID Card
describe('OFAC - ID Card - Name and DOB match', function () {
  this.timeout(0);
  let namedob_id_smt = new SMT(poseidon2, true);
  let memSmtInputs: any;
  let nonMemSmtInputs: any;

  before(async () => {
    circuit = await wasm_tester(
      // Use the same circuit as passport level 2
      path.join(__dirname, '../../circuits/tests/ofac/ofac_name_dob_id_tester.circom'),
      {
        include: [
          'node_modules',
          'node_modules/@zk-kit/binary-merkle-root.circom/src',
          'node_modules/circomlib/circuits',
        ],
      }
    );

    // IMPORTANT: Ensure this JSON path is correct
    namedob_id_smt.import(nameAndDobIdCardJson);
    const proofLevel = 2;
    memSmtInputs = generateCircuitInputsOfac(
      idCardDataInOfac, // Use ID card data
      namedob_id_smt,
      proofLevel
    );

    nonMemSmtInputs = generateCircuitInputsOfac(
      idCardData, // Use ID card data
      namedob_id_smt,
      proofLevel
    );
  });

  it('ID Card L2: should pass without errors, non-membership', async function () {
    let w = await circuit.calculateWitness(nonMemSmtInputs);
    const ofacCheckResult = (await circuit.getOutput(w, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('1'); // 1 means not found (non-membership is ok)
  });

  it('ID Card L2: should pass - ID card details are in OFAC list', async function () {
    let w = await circuit.calculateWitness(memSmtInputs);
    const ofacCheckResult = (await circuit.getOutput(w, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0'); // 0 means found (membership proof fails non-membership check)
  });

  it('ID Card L2: should fail - wrong leaf key provided', async function () {
    const wrongInputs = {
      ...nonMemSmtInputs,
      smt_leaf_key: BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString(),
    };
    let w = await circuit.calculateWitness(wrongInputs);
    const ofacCheckResult = (await circuit.getOutput(w, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0'); // Fails because root won't match
  });
});

// Level 1: Name and YOB match in OfacList - ID Card
describe('OFAC - ID Card - Name and YOB match', function () {
  this.timeout(0);
  let nameyob_id_smt = new SMT(poseidon2, true);
  let memSmtInputs: any;
  let nonMemSmtInputs: any;

  before(async () => {
    circuit = await wasm_tester(
      // Use the same circuit as passport level 1
      path.join(__dirname, '../../circuits/tests/ofac/ofac_name_yob_id_tester.circom'),
      {
        include: [
          'node_modules',
          'node_modules/@zk-kit/binary-merkle-root.circom/src',
          'node_modules/circomlib/circuits',
        ],
      }
    );

    // IMPORTANT: Ensure this JSON path is correct
    nameyob_id_smt.import(nameAndYobIdCardJson);
    const proofLevel = 1;
    memSmtInputs = generateCircuitInputsOfac(
      idCardDataInOfac, // Use ID card data
      nameyob_id_smt,
      proofLevel
    );

    nonMemSmtInputs = generateCircuitInputsOfac(
      idCardData, // Use ID card data
      nameyob_id_smt,
      proofLevel
    );
  });

  // it('should compile and load the circuit for ID Card, level 1', async function () {
  //   expect(circuit).to.not.be.undefined;
  // });

  it('ID Card L1: should pass without errors, non-membership', async function () {
    let w = await circuit.calculateWitness(nonMemSmtInputs);
    const ofacCheckResult = (await circuit.getOutput(w, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('1'); // 1 means not found (non-membership is ok)
  });

  it('ID Card L1: should pass - ID card details are in OFAC list', async function () {
    let w = await circuit.calculateWitness(memSmtInputs);
    const ofacCheckResult = (await circuit.getOutput(w, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0'); // 0 means found (membership proof fails non-membership check)
  });

  it('ID Card L1: should fail - wrong leaf key provided', async function () {
    const wrongInputs = {
      ...nonMemSmtInputs,
      smt_leaf_key: BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString(),
    };
    let w = await circuit.calculateWitness(wrongInputs);
    const ofacCheckResult = (await circuit.getOutput(w, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0'); // Fails because root won't match
  });
});
