import { expect } from 'chai';
import { wasm as wasmTester } from 'circom_tester';
import * as path from 'path';
import {
  generateCircuitInputsOfac,
  NON_OFAC_DUMMY_INPUT,
  OFAC_DUMMY_INPUT,
} from '../../../../../common/src/utils/kyc/generateInputs';
import { serializeKycData } from '../../../../../common/src/utils/kyc/types';
import { SMT } from '@openpassport/zk-kit-smt';
import { poseidon2 } from 'poseidon-lite';
import nameAndDobjson from '../../../consts/ofac/nameAndDobKycSMT.json';
import nameAndYobjson from '../../../consts/ofac/nameAndYobKycSMT.json';

describe('OFAC - Name and DOB match', async function () {
  this.timeout(10000);
  let circuit;
  let namedob_smt = new SMT(poseidon2, true);
  let proofLevel = 2;

  before(async () => {
    circuit = await wasmTester(path.join(__dirname, 'ofac_name_dob_kyc.test.circom'), {
      include: [
        'node_modules',
        './node_modules/@zk-kit/binary-merkle-root.circom/src',
        './node_modules/circomlib/circuits',
      ],
    });

    namedob_smt.import(nameAndDobjson);
  });

  it('should compile and load the circuit', async () => {
    expect(circuit).to.not.be.undefined;
  });

  it('should return 0 if the person is in the ofac list', async () => {
    const dummy_kyc_input = serializeKycData(OFAC_DUMMY_INPUT);
    const ofacInputs = generateCircuitInputsOfac(OFAC_DUMMY_INPUT, namedob_smt, proofLevel);
    const inputs = {
      kyc_data: dummy_kyc_input.split('').map((x) => x.charCodeAt(0)),
      ...ofacInputs,
    };

    const witness = await circuit.calculateWitness(inputs);
    const ofacCheckResult = (await circuit.getOutput(witness, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0');
  });

  it('should return 1 if the person is not in the ofac list', async () => {
    const dummy_kyc_input = serializeKycData(NON_OFAC_DUMMY_INPUT);
    const ofacInputs = generateCircuitInputsOfac(NON_OFAC_DUMMY_INPUT, namedob_smt, proofLevel);
    const inputs = {
      kyc_data: dummy_kyc_input.split('').map((x) => x.charCodeAt(0)),
      ...ofacInputs,
    };

    const witness = await circuit.calculateWitness(inputs);
    const ofacCheckResult = (await circuit.getOutput(witness, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('1');
  });

  it('should return 0 if the internal computed merkle root is wrong (wrong leaf key)', async () => {
    const dummy_kyc_input = serializeKycData(OFAC_DUMMY_INPUT);
    const ofacInputs = generateCircuitInputsOfac(OFAC_DUMMY_INPUT, namedob_smt, proofLevel);
    const inputs = {
      kyc_data: dummy_kyc_input.split('').map((x) => x.charCodeAt(0)),
      ...ofacInputs,
      smt_leaf_key: BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString(),
    };

    const witness = await circuit.calculateWitness(inputs);
    const ofacCheckResult = (await circuit.getOutput(witness, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0');
  });

  it('should return 0 if the internal computed merkle root is wrong (wrong siblings)', async () => {
    const dummy_kyc_input = serializeKycData(OFAC_DUMMY_INPUT);
    const ofacInputs = generateCircuitInputsOfac(OFAC_DUMMY_INPUT, namedob_smt, proofLevel);
    ofacInputs.smt_siblings[0] = BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString();
    const inputs = {
      kyc_data: dummy_kyc_input.split('').map((x) => x.charCodeAt(0)),
      ...ofacInputs,
    };

    const witness = await circuit.calculateWitness(inputs);
    const ofacCheckResult = (await circuit.getOutput(witness, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0');
  });

  it('should return 0 if the merkle root is wrong', async () => {
    const dummy_kyc_input = serializeKycData(OFAC_DUMMY_INPUT);
    const ofacInputs = generateCircuitInputsOfac(OFAC_DUMMY_INPUT, namedob_smt, proofLevel);
    const inputs = {
      kyc_data: dummy_kyc_input.split('').map((x) => x.charCodeAt(0)),
      ...ofacInputs,
      smt_root: BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString(),
    };

    const witness = await circuit.calculateWitness(inputs);
    const ofacCheckResult = (await circuit.getOutput(witness, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0');
  });
});

describe('OFAC - Name and YOB match', async function () {
  this.timeout(10000);
  let circuit;
  let nameyob_smt = new SMT(poseidon2, true);
  let proofLevel = 1;

  before(async () => {
    circuit = await wasmTester(path.join(__dirname, 'ofac_name_yob_kyc.test.circom'), {
      include: [
        'node_modules',
        './node_modules/@zk-kit/binary-merkle-root.circom/src',
        './node_modules/circomlib/circuits',
      ],
    });

    nameyob_smt.import(nameAndYobjson);
  });

  it('should compile and load the circuit', async () => {
    expect(circuit).to.not.be.undefined;
  });

  it('should return 0 if the person is in the ofac list', async () => {
    const dummy_kyc_input = serializeKycData(OFAC_DUMMY_INPUT);
    const ofacInputs = generateCircuitInputsOfac(OFAC_DUMMY_INPUT, nameyob_smt, proofLevel);
    const inputs = {
      kyc_data: dummy_kyc_input.split('').map((x) => x.charCodeAt(0)),
      ...ofacInputs,
    };

    const witness = await circuit.calculateWitness(inputs);
    const ofacCheckResult = (await circuit.getOutput(witness, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0');
  });

  it('should return 1 if the person is not in the ofac list', async () => {
    const dummy_kyc_input = serializeKycData(NON_OFAC_DUMMY_INPUT);
    const ofacInputs = generateCircuitInputsOfac(NON_OFAC_DUMMY_INPUT, nameyob_smt, proofLevel);
    const inputs = {
      kyc_data: dummy_kyc_input.split('').map((x) => x.charCodeAt(0)),
      ...ofacInputs,
    };

    const witness = await circuit.calculateWitness(inputs);
    const ofacCheckResult = (await circuit.getOutput(witness, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('1');
  });

  it('should return 0 if the internal computed merkle root is wrong (wrong leaf key)', async () => {
    const dummy_kyc_input = serializeKycData(OFAC_DUMMY_INPUT);
    const ofacInputs = generateCircuitInputsOfac(OFAC_DUMMY_INPUT, nameyob_smt, proofLevel);
    const inputs = {
      kyc_data: dummy_kyc_input.split('').map((x) => x.charCodeAt(0)),
      ...ofacInputs,
      smt_leaf_key: BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString(),
    };

    const witness = await circuit.calculateWitness(inputs);
    const ofacCheckResult = (await circuit.getOutput(witness, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0');
  });

  it('should return 0 if the internal computed merkle root is wrong (wrong siblings)', async () => {
    const dummy_kyc_input = serializeKycData(OFAC_DUMMY_INPUT);
    const ofacInputs = generateCircuitInputsOfac(OFAC_DUMMY_INPUT, nameyob_smt, proofLevel);
    ofacInputs.smt_siblings[0] = BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString();
    const inputs = {
      kyc_data: dummy_kyc_input.split('').map((x) => x.charCodeAt(0)),
      ...ofacInputs,
    };

    const witness = await circuit.calculateWitness(inputs);
    const ofacCheckResult = (await circuit.getOutput(witness, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0');
  });

  it('should return 0 if the merkle root is wrong', async () => {
    const dummy_kyc_input = serializeKycData(OFAC_DUMMY_INPUT);
    const ofacInputs = generateCircuitInputsOfac(OFAC_DUMMY_INPUT, nameyob_smt, proofLevel);
    const inputs = {
      kyc_data: dummy_kyc_input.split('').map((x) => x.charCodeAt(0)),
      ...ofacInputs,
      smt_root: BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString(),
    };

    const witness = await circuit.calculateWitness(inputs);
    const ofacCheckResult = (await circuit.getOutput(witness, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0');
  });
});
