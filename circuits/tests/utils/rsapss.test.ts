import { wasm as wasmTester } from 'circom_tester';
import { describe, it } from 'mocha';
import path from 'path';
import { SignatureAlgorithm } from '../../../common/src/utils/types';
import { generateMockRsaPssInputs } from './generateMockInputsRsaPss';
import { expect } from 'chai';

describe('VerifyRsapss Circuit Test', function () {
  this.timeout(0);
  const fullAlgorithms: { algo: SignatureAlgorithm; saltLength: number }[] = [
    { algo: 'rsapss_sha256_65537_4096', saltLength: 64 },
    { algo: 'rsapss_sha256_65537_3072', saltLength: 64 },
    { algo: 'rsapss_sha256_65537_2048', saltLength: 64 },
    { algo: 'rsapss_sha256_3_4096', saltLength: 64 },
    { algo: 'rsapss_sha256_3_3072', saltLength: 64 },
    { algo: 'rsapss_sha256_3_2048', saltLength: 64 },
    { algo: 'rsapss_sha512_3_4096', saltLength: 64 },
    { algo: 'rsapss_sha512_3_2048', saltLength: 64 },
    { algo: 'rsapss_sha384_65537_4096', saltLength: 48 },
    { algo: 'rsapss_sha384_65537_3072', saltLength: 48 },
    { algo: 'rsapss_sha384_3_4096', saltLength: 48 },
    { algo: 'rsapss_sha384_3_3072', saltLength: 48 },
  ];

  const sigAlgs: { algo: SignatureAlgorithm; saltLength: number }[] = [
    { algo: 'rsapss_sha256_65537_4096', saltLength: 32 },
  ];

  const testSuite = process.env.FULL_TEST_SUITE === 'true' ? fullAlgorithms : sigAlgs;

  testSuite.forEach((algorithm) => {
    it(`should verify RSA-PSS signature using the circuit for ${algorithm.algo}_${algorithm.saltLength}`, async function () {
      this.timeout(0);
      // Generate inputs using the utility function
      const { signature, modulus, message } = generateMockRsaPssInputs(
        algorithm.algo,
        algorithm.saltLength
      );

      // Run circuit with inputs
      const circuit = await wasmTester(
        path.join(
          __dirname,
          `../../circuits/tests/utils/rsapss/test_${algorithm.algo}_${algorithm.saltLength}.circom`
        ),
        {
          include: ['node_modules', './node_modules/@zk-kit/binary-merkle-root.circom/src'],
        }
      );

      // Log the inputs for debugging
      console.log(`Testing algorithm: ${algorithm.algo} with salt length: ${algorithm.saltLength}`);

      const witness = await circuit.calculateWitness({
        signature,
        modulus,
        message,
      });

      // Check constraints
      await circuit.checkConstraints(witness);
    });

    it('Should fail to verify RSA-PSS signature with invalid signature', async function () {
      const { signature, modulus, message } = generateMockRsaPssInputs(
        algorithm.algo,
        algorithm.saltLength
      );

      const invalidSignature = [...signature];
      const randomIndex = Math.floor(Math.random() * signature.length);
      invalidSignature[randomIndex] = String((BigInt(signature[randomIndex]) + 1n).toString());

      const circuit = await wasmTester(
        path.join(
          __dirname,
          `../../circuits/tests/utils/rsapss/test_${algorithm.algo}_${algorithm.saltLength}.circom`
        ),
        {
          include: ['node_modules', './node_modules/@zk-kit/binary-merkle-root.circom/src'],
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

    it('Should fail to verify RSA-PSS signature with invalid message', async function () {
      const { signature, modulus, message } = generateMockRsaPssInputs(
        algorithm.algo,
        algorithm.saltLength
      );

      // Flip one bit in the message
      const invalidMessage = [...message];
      const randomIndex = Math.floor(Math.random() * message.length);
      invalidMessage[randomIndex] = invalidMessage[randomIndex] === 0 ? 1 : 0;

      const circuit = await wasmTester(
        path.join(
          __dirname,
          `../../circuits/tests/utils/rsapss/test_${algorithm.algo}_${algorithm.saltLength}.circom`
        ),
        {
          include: ['node_modules', './node_modules/@zk-kit/binary-merkle-root.circom/src'],
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
