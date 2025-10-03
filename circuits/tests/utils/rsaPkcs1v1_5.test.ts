import { wasm as wasmTester } from 'circom_tester';
import { describe, it } from 'mocha';
import path from 'path';
import { generateMockRsaPkcs1v1_5Inputs } from './generateMockInputsInCircuits.js';
import { SignatureAlgorithm } from '@selfxyz/common/utils/types';
import { expect } from 'chai';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('VerifyRsaPkcs1v1_5 Circuit Test', function () {
  this.timeout(0);
  /** Some tests are disabled to avoid overloading the CI/CD pipeline - the commented rsa verifications will however be tested in prove.test.ts and dsc.test.ts **/
  const rsaAlgorithms: SignatureAlgorithm[] = ['rsa_sha256_56611_4096'];
  const fullRsaAlgorithms: SignatureAlgorithm[] = [
    'rsa_sha1_65537_2048',
    'rsa_sha256_65537_2048',
    'rsa_sha256_3_2048',
    'rsa_sha256_65537_3072',
    'rsa_sha256_65537_4096',
    'rsa_sha512_65537_4096',
    'rsa_sha224_65537_2048',
    'rsa_sha1_65537_4096',
    'rsa_sha1_64321_4096',
    'rsa_sha256_130689_4096',
    'rsa_sha256_122125_4096',
    'rsa_sha256_107903_4096',
    'rsa_sha256_56611_4096',
  ];

  rsaAlgorithms.forEach((algorithm) => {
    it(`should verify RSA signature using the circuit for ${algorithm}`, async function () {
      // Generate inputs using the utility function
      const { signature, modulus, message } = generateMockRsaPkcs1v1_5Inputs(algorithm);

      // Run circuit with inputs
      const circuit = await wasmTester(
        path.join(__dirname, `../../circuits/tests/utils/rsa/test_${algorithm}.circom`),
        {
          include: ['node_modules', 'node_modules/@zk-kit/binary-merkle-root.circom/src'],
        }
      );

      // Log the inputs for debugging
      console.log(`Testing algorithm: ${algorithm}`);

      const witness = await circuit.calculateWitness({
        signature,
        modulus,
        message,
      });

      // Check constraints
      await circuit.checkConstraints(witness);
    });

    it('Should fail to verify RSA signature with invalid signature', async function () {
      const { signature, modulus, message } = generateMockRsaPkcs1v1_5Inputs(algorithm);

      const invalidSignature = signature.map((byte: string) => String((parseInt(byte) + 1) % 256));
      const circuit = await wasmTester(
        path.join(__dirname, `../../circuits/tests/utils/rsa/test_${algorithm}.circom`),
        {
          include: ['node_modules', 'node_modules/@zk-kit/binary-merkle-root.circom/src'],
        }
      );

      try {
        await circuit.calculateWitness({
          signature: invalidSignature,
          modulus,
          message,
        });
      } catch (error) {
        expect(error.message).to.include('Assert Failed');
      }
    });

    it('Should fail to verify RSA signature with invalid message', async function () {
      const { signature, modulus, message } = generateMockRsaPkcs1v1_5Inputs(algorithm);

      const invalidMessage = message.map((byte: string) => String((parseInt(byte) + 1) % 256));
      const circuit = await wasmTester(
        path.join(__dirname, `../../circuits/tests/utils/rsa/test_${algorithm}.circom`),
        {
          include: ['node_modules', 'node_modules/@zk-kit/binary-merkle-root.circom/src'],
        }
      );

      try {
        await circuit.calculateWitness({
          signature,
          modulus,
          message: invalidMessage,
        });
      } catch (error) {
        expect(error.message).to.include('Assert Failed');
      }
    });
  });
});
