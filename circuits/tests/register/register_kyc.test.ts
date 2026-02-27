import { expect } from 'chai';
import { wasm as wasmTester } from 'circom_tester';
import path from 'path';
import { packBytesAndPoseidon } from '@selfxyz/common/utils/hash';
import { poseidon2 } from 'poseidon-lite';
import {
  generateKycRegisterInput,
  generateMockKycRegisterInput,
} from '@selfxyz/common/utils/kyc/generateInputs.js';
import { KycRegisterInput } from '@selfxyz/common/utils/kyc/types';
import {
  KYC_ID_NUMBER_INDEX,
  KYC_ID_NUMBER_LENGTH,
  KYC_ID_TYPE_INDEX,
  KYC_ID_TYPE_LENGTH,
} from '@selfxyz/common/utils/kyc/constants';

describe('REGISTER KYC Circuit Tests', () => {
  let circuit: any;
  let input: KycRegisterInput;

  before(async function () {
    this.timeout(0);
    input = await generateMockKycRegisterInput(null, true, undefined);
    circuit = await wasmTester(
      path.join(__dirname, '../../circuits/register/instances/register_kyc.circom'),
      {
        verbose: true,
        logOutput: true,
        include: ['node_modules'],
      }
    );
  });

  it('should compile and load the circuit', async function () {
    this.timeout(0);
    expect(circuit).to.not.be.undefined;
  });

  it('should generate the correct input', async function () {
    this.timeout(0);
    const w = await circuit.calculateWitness(input);
    await circuit.checkConstraints(w);
  });

  it('should generate the correct nullifier and commitment', async function () {
    this.timeout(0);

    let idnumber = input.data_padded.slice(
      KYC_ID_NUMBER_INDEX,
      KYC_ID_NUMBER_INDEX + KYC_ID_NUMBER_LENGTH
    );
    const nullifierInputs = [
      ...'sumsub'.split('').map((x) => x.charCodeAt(0)),
      ...idnumber,
      ...input.data_padded.slice(KYC_ID_TYPE_INDEX, KYC_ID_TYPE_INDEX + KYC_ID_TYPE_LENGTH),
    ];
    const nullifier = packBytesAndPoseidon(nullifierInputs);
    const commitment = poseidon2([
      input.secret,
      packBytesAndPoseidon(input.data_padded.map((x) => Number(x))),
    ]);

    const w = await circuit.calculateWitness(input);
    await circuit.checkConstraints(w);
    const calnullifier = (await circuit.getOutput(w, ['nullifier'])).nullifier;
    const calcommitment = (await circuit.getOutput(w, ['commitment'])).commitment;
    expect(nullifier.toString()).to.be.equal(calnullifier);
    expect(commitment.toString()).to.be.equal(calcommitment);
  });

  it('should not verify if the signature is invalid', async function () {
    this.timeout(0);
    input.s = BigInt(input.s) + BigInt(1);
    try {
      const w = await circuit.calculateWitness(input);
      await circuit.checkConstraints(w);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
    }
  });

  it('should fail if data is tampered', async function () {
    this.timeout(0);
    input = await generateMockKycRegisterInput(null, true, undefined);
    input.data_padded[5] = Number(input.data_padded[5]) + 1;
    try {
      const w = await circuit.calculateWitness(input);
      await circuit.checkConstraints(w);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
    }
  });

  it('should fail if data is not bytes', async function () {
    this.timeout(0);
    input = await generateMockKycRegisterInput(null, true, undefined);
    input.data_padded[5] = 8000;
    try {
      const w = await circuit.calculateWitness(input);
      await circuit.checkConstraints(w);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
    }
  });

  it('should fail if s is greater than subgroup order', async function () {
    this.timeout(0);
    input.s = BigInt(
      '2736030358979909402780800718157159386076813972158567259200215660948447373041'
    );
    try {
      const w = await circuit.calculateWitness(input);
      await circuit.checkConstraints(w);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
    }
  });

  it('should fail if s is 0', async function () {
    this.timeout(0);
    input = await generateMockKycRegisterInput(null, true, undefined);
    input.s = BigInt(0);
    try {
      const w = await circuit.calculateWitness(input);
      await circuit.checkConstraints(w);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
    }
  });

  it('should fail if R is not on the curve', async function () {
    this.timeout(0);
    input = await generateMockKycRegisterInput(null, true, undefined);
    //go beyond the suborder
    input.R[0] = BigInt(
      BigInt('9736030358979909402780800718157159386076813972158567259200215660948447373049') + 1n
    );
    input.R[1] = BigInt(1);
    try {
      const w = await circuit.calculateWitness(input);
      await circuit.checkConstraints(w);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('BabyCheck');
    }
  });

  it('should fail if pubKey is not on the curve', async function () {
    this.timeout(0);
    input = await generateMockKycRegisterInput(null, true, undefined);
    input.pubKey[0] = BigInt(
      '2736030358979909402780800718157159386076813972158567259200215660948447373049'
    );
    input.pubKey[1] = BigInt(
      '2736030358979909402780800718157159386076813972158567259200215660948447373049'
    );
    try {
      const w = await circuit.calculateWitness(input);
      await circuit.checkConstraints(w);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('BabyCheck');
    }
  });
});
