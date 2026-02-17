import { wasm as wasmTester } from 'circom_tester';
import * as path from 'path';
import {
  NON_OFAC_DUMMY_INPUT,
  OFAC_DUMMY_INPUT,
  KYC_MAX_LENGTH,
  serializeKycData,
} from '@selfxyz/common';
import { SMT } from '@openpassport/zk-kit-smt';
import { poseidon2 } from 'poseidon-lite';
import { unpackReveal } from '@selfxyz/common/utils/circuits/formatOutputs.js';
import { deepEqual } from 'assert';
import { expect } from 'chai';
import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { generateKycDiscloseInput } from '@selfxyz/common/utils/kyc/generateInputs';
import { KycField } from '@selfxyz/common/utils/kyc/constants';
import fs from 'fs';

const __dirname = path.dirname(__filename);

// Load KYC OFAC trees at module level
const nameAndDobKycjson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../consts/ofac/nameAndDobKycSMT.json'), 'utf8')
);
const nameAndYobKycjson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../consts/ofac/nameAndYobKycSMT.json'), 'utf8')
);

// Create SMTs at module level
const namedob_smt = new SMT(poseidon2, true);
namedob_smt.import(nameAndDobKycjson as any);

const nameyob_smt = new SMT(poseidon2, true);
nameyob_smt.import(nameAndYobKycjson as any);

// Helper function to compute chunk length (matches computeIntChunkLength in circuit)
const computeChunkLength = (dataLength: number): number => {
  return Math.ceil(dataLength / 31);
};

describe('VC_AND_DISCLOSE KYC Circuit Tests', () => {
  let circuit: any;
  let tree: LeanIMT;

  const maxLength = KYC_MAX_LENGTH;
  const chunkLength = computeChunkLength(KYC_MAX_LENGTH + 2 + 1);

  // Helper function to extract revealed data packed array
  const getRevealedDataPacked = async (witness: any): Promise<string[]> => {
    // circuit.getOutput with the array length returns all elements 0 to length-1
    const revealedData = await circuit.getOutput(witness, [`revealedData_packed[${chunkLength}]`]);
    return Array.from({ length: chunkLength }, (_, i) =>
      revealedData[`revealedData_packed[${i}]`].toString()
    );
  };

  before(async function () {
    this.timeout(0);

    tree = new LeanIMT((a, b) => poseidon2([a, b]), []);

    circuit = await wasmTester(
      path.join(__dirname, '../../circuits/disclose/vc_and_disclose_kyc.circom'),
      {
        verbose: true,
        logOutput: true,
        include: [
          'node_modules',
          'node_modules/@zk-kit/binary-merkle-root.circom/src',
          'node_modules/circomlib/circuits',
        ],
      }
    );
  });

  it('should compile and load the circuit', async function () {
    this.timeout(0);
    expect(circuit).to.not.be.undefined;
  });

  it('should verify for correct Circuit Input and output', async function () {
    this.timeout(0);
    const input = generateKycDiscloseInput(
      false,
      namedob_smt,
      nameyob_smt,
      tree as any,
      false,
      '0',
      '1234567890',
      undefined,
      undefined,
      undefined,
      true,
      '1234'
    );
    const witness = await circuit.calculateWitness(input);
    await circuit.checkConstraints(witness);
  });

  it('should fail for invalid msg ascii', async function () {
    this.timeout(0);
    const input = generateKycDiscloseInput(
      false,
      namedob_smt,
      nameyob_smt,
      tree as any,
      false,
      '0',
      '1234567890',
      undefined,
      undefined,
      undefined,
      true,
      '1234'
    );

    input.data_padded[4] = '9999999';
    try {
      const witness = await circuit.calculateWitness(input);
      await circuit.checkConstraints(witness);
      throw new Error('Circuit verified for invalid msg byte ascii');
    } catch (e) {
      const errMsg = e?.message || e?.toString?.() || '';
      if (!errMsg.includes('Num2Bits')) {
        throw new Error(`Expected error message to include "Num2Bits", but got:\n${errMsg}`);
      }
    }
  });

  it('should return 0 for an OFAC person', async function () {
    this.timeout(0);
    const input = generateKycDiscloseInput(
      true,
      namedob_smt,
      nameyob_smt,
      tree as any,
      true,
      '0',
      '1234567890',
      undefined,
      undefined,
      undefined,
      true,
      '1234'
    );
    const witness = await circuit.calculateWitness(input);
    await circuit.checkConstraints(witness);

    const revealedData_packed = await getRevealedDataPacked(witness);
    const revealedDataUnpacked = unpackReveal(revealedData_packed, 'id');
    const ofac_results = revealedDataUnpacked.slice(maxLength, maxLength + 2);

    deepEqual(ofac_results, ['\x00', '\x00']);
  });

  it('should return 0 for an OFAC person with reverse', async function () {
    this.timeout(0);
    const input = generateKycDiscloseInput(
      true,
      namedob_smt,
      nameyob_smt,
      tree as any,
      true,
      '0',
      '1234567890',
      undefined,
      undefined,
      undefined,
      true,
      '1234',
      true
    );
    const witness = await circuit.calculateWitness(input);
    await circuit.checkConstraints(witness);

    const revealedData_packed = await getRevealedDataPacked(witness);
    const revealedDataUnpacked = unpackReveal(revealedData_packed, 'id');
    const ofac_results = revealedDataUnpacked.slice(maxLength, maxLength + 2);

    deepEqual(ofac_results, ['\x00', '\x00']);
  });

  it('should return 1 for a non OFAC person', async function () {
    this.timeout(0);
    const input = generateKycDiscloseInput(
      false,
      namedob_smt,
      nameyob_smt,
      tree as any,
      true,
      '0',
      '1234567890',
      undefined,
      undefined,
      undefined,
      true,
      '1234'
    );
    const witness = await circuit.calculateWitness(input);
    await circuit.checkConstraints(witness);

    const revealedData_packed = await getRevealedDataPacked(witness);
    const revealedDataUnpacked = unpackReveal(revealedData_packed, 'id');
    const ofac_results = revealedDataUnpacked.slice(maxLength, maxLength + 2);

    deepEqual(ofac_results, ['\x01', '\x01']);
  });

  it('should return revealed data that matches the actual data', async function () {
    this.timeout(0);

    const fieldsToReveal: KycField[] = [
      'COUNTRY',
      'ID_TYPE',
      'ID_NUMBER',
      'ISSUANCE_DATE',
      'EXPIRY_DATE',
      'FULL_NAME',
      'DOB',
      'PHOTO_HASH',
      'PHONE_NUMBER',
      'GENDER',
      'ADDRESS',
    ];
    const input = generateKycDiscloseInput(
      false,
      namedob_smt,
      nameyob_smt,
      tree as any,
      true,
      '0',
      '1234567890',
      fieldsToReveal,
      undefined,
      18,
      true,
      '1234'
    );
    const witness = await circuit.calculateWitness(input);
    await circuit.checkConstraints(witness);

    const revealedData_packed = await getRevealedDataPacked(witness);
    const revealedDataUnpacked = unpackReveal(revealedData_packed, 'id');

    const serializedData = Buffer.from(serializeKycData(NON_OFAC_DUMMY_INPUT), 'utf8');
    const serializedArray = Array.from(serializedData);

    for (let i = 0; i < Math.min(serializedArray.length, maxLength); i++) {
      const expectedByte = serializedArray[i];
      const expectedChar = String.fromCharCode(expectedByte);
      const revealedChar = revealedDataUnpacked[i];
      const revealedByte = revealedChar.charCodeAt(0);
      expect(revealedByte).to.equal(
        expectedByte,
        `Mismatch at position ${i}: expected '${expectedChar}' (${expectedByte}) but got '${revealedChar}' (${revealedByte})`
      );
    }

    const ofac_results = revealedDataUnpacked.slice(maxLength, maxLength + 2);
    deepEqual(ofac_results, ['\x01', '\x01']);

    const age_result_byte = revealedDataUnpacked[maxLength + 2].charCodeAt(0);
    expect(age_result_byte).to.equal(18);
  });

  it('should return revealed data that matches the actual data for OFAC person', async function () {
    this.timeout(0);

    const fieldsToReveal: KycField[] = [
      'COUNTRY',
      'ID_TYPE',
      'ID_NUMBER',
      'ISSUANCE_DATE',
      'EXPIRY_DATE',
      'FULL_NAME',
      'DOB',
      'PHOTO_HASH',
      'PHONE_NUMBER',
      'GENDER',
      'ADDRESS',
    ];
    const input = generateKycDiscloseInput(
      true,
      namedob_smt,
      nameyob_smt,
      tree as any,
      true,
      '0',
      '1234567890',
      fieldsToReveal,
      undefined,
      undefined,
      true,
      '1234'
    );

    const witness = await circuit.calculateWitness(input);
    await circuit.checkConstraints(witness);

    const revealedData_packed = await getRevealedDataPacked(witness);
    const revealedDataUnpacked = unpackReveal(revealedData_packed, 'id');

    const serializedData = Buffer.from(serializeKycData(OFAC_DUMMY_INPUT), 'utf8');
    const serializedArray = Array.from(serializedData);

    for (let i = 0; i < Math.min(serializedArray.length, maxLength); i++) {
      const expectedByte = serializedArray[i];
      const expectedChar = String.fromCharCode(expectedByte);
      const revealedChar = revealedDataUnpacked[i];
      const revealedByte = revealedChar.charCodeAt(0);
      expect(revealedByte).to.equal(
        expectedByte,
        `Mismatch at position ${i}: expected '${expectedChar}' (${expectedByte}) but got '${revealedChar}' (${revealedByte})`
      );
    }

    const ofac_results = revealedDataUnpacked.slice(maxLength, maxLength + 2);
    deepEqual(ofac_results, ['\x00', '\x00']);

    const age_result_byte = revealedDataUnpacked[maxLength + 2].charCodeAt(0);
    expect(age_result_byte).to.equal(0);
  });
});
