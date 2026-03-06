import { expect } from 'chai';
import { wasm as wasmTester } from 'circom_tester';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import {
  NON_OFAC_DUMMY_KYC_DATA,
  OFAC_DUMMY_KYC_DATA,
} from '@selfxyz/new-common/src/testing/genMockKycData.js';
import { serializeKycData } from '@selfxyz/new-common/src/documents/kyc/types.js';
import {
  getNameDobLeafKyc,
  getNameYobLeafKyc,
  generateSMTProof,
} from '@selfxyz/new-common/src/trees/index.js';
import { SMT } from '@openpassport/zk-kit-smt';
import { formatInput } from '@selfxyz/new-common/src/circuits/inputs/format.js';
import type { KycData } from '@selfxyz/new-common/src/documents/kyc/types.js';
import { poseidon2 } from 'poseidon-lite';
import nameAndDobjson from '../../../consts/ofac/nameAndDobKycSMT.json' with { type: 'json' };
import nameAndYobjson from '../../../consts/ofac/nameAndYobKycSMT.json' with { type: 'json' };

const generateCircuitInputsOfac = (
  data: Omit<
    KycData,
    'user_identifier' | 'current_date' | 'majority_age_ASCII' | 'selector_older_than'
  >,
  smt: SMT,
  proofLevel: number
) => {
  const leaf =
    proofLevel === 2
      ? getNameDobLeafKyc(data.fullName, data.dob)
      : getNameYobLeafKyc(data.fullName, data.dob.slice(0, 4));
  const { root, closestleaf, siblings } = generateSMTProof(smt, leaf);
  return {
    smt_root: formatInput(root),
    smt_leaf_key: formatInput(closestleaf),
    smt_siblings: formatInput(siblings),
  };
};

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

    namedob_smt.import(nameAndDobjson as any);
  });

  it('should compile and load the circuit', async () => {
    expect(circuit).to.not.be.undefined;
  });

  it('should return 0 if the person is in the ofac list', async () => {
    const dummy_kyc_input = serializeKycData(OFAC_DUMMY_KYC_DATA);
    const ofacInputs = generateCircuitInputsOfac(OFAC_DUMMY_KYC_DATA, namedob_smt, proofLevel);
    const inputs = {
      data_padded: dummy_kyc_input.split('').map((x) => x.charCodeAt(0)),
      ...ofacInputs,
    };

    const witness = await circuit.calculateWitness(inputs);
    const ofacCheckResult = (await circuit.getOutput(witness, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0');
  });

  it('should return 1 if the person is not in the ofac list', async () => {
    const dummy_kyc_input = serializeKycData(NON_OFAC_DUMMY_KYC_DATA);
    const ofacInputs = generateCircuitInputsOfac(NON_OFAC_DUMMY_KYC_DATA, namedob_smt, proofLevel);
    const inputs = {
      data_padded: dummy_kyc_input.split('').map((x) => x.charCodeAt(0)),
      ...ofacInputs,
    };

    const witness = await circuit.calculateWitness(inputs);
    const ofacCheckResult = (await circuit.getOutput(witness, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('1');
  });

  it('should return 0 if the internal computed merkle root is wrong (wrong leaf key)', async () => {
    const dummy_kyc_input = serializeKycData(OFAC_DUMMY_KYC_DATA);
    const ofacInputs = generateCircuitInputsOfac(OFAC_DUMMY_KYC_DATA, namedob_smt, proofLevel);
    const inputs = {
      data_padded: dummy_kyc_input.split('').map((x) => x.charCodeAt(0)),
      ...ofacInputs,
      smt_leaf_key: BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString(),
    };

    const witness = await circuit.calculateWitness(inputs);
    const ofacCheckResult = (await circuit.getOutput(witness, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0');
  });

  it('should return 0 if the internal computed merkle root is wrong (wrong siblings)', async () => {
    const dummy_kyc_input = serializeKycData(OFAC_DUMMY_KYC_DATA);
    const ofacInputs = generateCircuitInputsOfac(OFAC_DUMMY_KYC_DATA, namedob_smt, proofLevel);
    ofacInputs.smt_siblings[0] = BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString();
    const inputs = {
      data_padded: dummy_kyc_input.split('').map((x) => x.charCodeAt(0)),
      ...ofacInputs,
    };

    const witness = await circuit.calculateWitness(inputs);
    const ofacCheckResult = (await circuit.getOutput(witness, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0');
  });

  it('should return 0 if the merkle root is wrong', async () => {
    const dummy_kyc_input = serializeKycData(OFAC_DUMMY_KYC_DATA);
    const ofacInputs = generateCircuitInputsOfac(OFAC_DUMMY_KYC_DATA, namedob_smt, proofLevel);
    const inputs = {
      data_padded: dummy_kyc_input.split('').map((x) => x.charCodeAt(0)),
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

    nameyob_smt.import(nameAndYobjson as any);
  });

  it('should compile and load the circuit', async () => {
    expect(circuit).to.not.be.undefined;
  });

  it('should return 0 if the person is in the ofac list', async () => {
    const dummy_kyc_input = serializeKycData(OFAC_DUMMY_KYC_DATA);
    const ofacInputs = generateCircuitInputsOfac(OFAC_DUMMY_KYC_DATA, nameyob_smt, proofLevel);
    const inputs = {
      data_padded: dummy_kyc_input.split('').map((x) => x.charCodeAt(0)),
      ...ofacInputs,
    };

    const witness = await circuit.calculateWitness(inputs);
    const ofacCheckResult = (await circuit.getOutput(witness, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0');
  });

  it('should return 1 if the person is not in the ofac list', async () => {
    const dummy_kyc_input = serializeKycData(NON_OFAC_DUMMY_KYC_DATA);
    const ofacInputs = generateCircuitInputsOfac(NON_OFAC_DUMMY_KYC_DATA, nameyob_smt, proofLevel);
    const inputs = {
      data_padded: dummy_kyc_input.split('').map((x) => x.charCodeAt(0)),
      ...ofacInputs,
    };

    const witness = await circuit.calculateWitness(inputs);
    const ofacCheckResult = (await circuit.getOutput(witness, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('1');
  });

  it('should return 0 if the internal computed merkle root is wrong (wrong leaf key)', async () => {
    const dummy_kyc_input = serializeKycData(OFAC_DUMMY_KYC_DATA);
    const ofacInputs = generateCircuitInputsOfac(OFAC_DUMMY_KYC_DATA, nameyob_smt, proofLevel);
    const inputs = {
      data_padded: dummy_kyc_input.split('').map((x) => x.charCodeAt(0)),
      ...ofacInputs,
      smt_leaf_key: BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString(),
    };

    const witness = await circuit.calculateWitness(inputs);
    const ofacCheckResult = (await circuit.getOutput(witness, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0');
  });

  it('should return 0 if the internal computed merkle root is wrong (wrong siblings)', async () => {
    const dummy_kyc_input = serializeKycData(OFAC_DUMMY_KYC_DATA);
    const ofacInputs = generateCircuitInputsOfac(OFAC_DUMMY_KYC_DATA, nameyob_smt, proofLevel);
    ofacInputs.smt_siblings[0] = BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString();
    const inputs = {
      data_padded: dummy_kyc_input.split('').map((x) => x.charCodeAt(0)),
      ...ofacInputs,
    };

    const witness = await circuit.calculateWitness(inputs);
    const ofacCheckResult = (await circuit.getOutput(witness, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0');
  });

  it('should return 0 if the merkle root is wrong', async () => {
    const dummy_kyc_input = serializeKycData(OFAC_DUMMY_KYC_DATA);
    const ofacInputs = generateCircuitInputsOfac(OFAC_DUMMY_KYC_DATA, nameyob_smt, proofLevel);
    const inputs = {
      data_padded: dummy_kyc_input.split('').map((x) => x.charCodeAt(0)),
      ...ofacInputs,
      smt_root: BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString(),
    };

    const witness = await circuit.calculateWitness(inputs);
    const ofacCheckResult = (await circuit.getOutput(witness, ['ofacCheckResult'])).ofacCheckResult;
    expect(ofacCheckResult).to.equal('0');
  });
});
