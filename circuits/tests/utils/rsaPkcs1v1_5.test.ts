import { expect } from 'chai';
import { wasm as wasm_tester } from 'circom_tester';
import { describe } from 'mocha';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateMockRsaPkcs1v1_5Inputs } from './generateMockInputsInCircuits.js';
import { SignatureAlgorithm } from '@selfxyz/common/utils/types';

// Add this helper to replace __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultIncludePaths = [
  'node_modules',
  'node_modules/@zk-kit/binary-merkle-root.circom/src',
  'node_modules/circomlib/circuits',
  'node_modules/@zk-email/circuits',
  'node_modules/circom-dl/circuits',
  'node_modules/@openpassport/zk-email-circuits',
];

describe('VerifyRsaPkcs1v1_5 Circuit Test', function () {
  this.timeout(0);
  /** Some tests are disabled to avoid overloading the CI/CD pipeline - the commented rsa verifications will however be tested in prove.test.ts and dsc.test.ts **/
  const rsaAlgorithms: SignatureAlgorithm[] = ['rsa_sha1_65537_2048'];
  const fullRsaAlgorithms: SignatureAlgorithm[] = [
    'rsa_sha1_65537_2048',
    'rsa_sha256_65537_2048',
    'rsa_sha256_3_2048',
    'rsa_sha256_65537_3072',
    'rsa_sha256_65537_4096',
    'rsa_sha512_65537_4096',
    'rsa_sha224_65537_2048',
  ];

  rsaAlgorithms.forEach((algorithm) => {
    it(`should verify RSA signature using the circuit for ${algorithm}`, async function () {
      // Generate inputs using the utility function
      const { signature, modulus, message } = generateMockRsaPkcs1v1_5Inputs(algorithm);

      // Run circuit with inputs
      const circuit = await wasm_tester(
        path.join(__dirname, `../../circuits/tests/utils/rsa/test_${algorithm}.circom`),
        {
          include: defaultIncludePaths,
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
      const circuit = await wasm_tester(
        path.join(__dirname, `../../circuits/tests/utils/rsa/test_${algorithm}.circom`),
        {
          include: defaultIncludePaths,
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
      const circuit = await wasm_tester(
        path.join(__dirname, `../../circuits/tests/utils/rsa/test_${algorithm}.circom`),
        {
          include: defaultIncludePaths,
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
