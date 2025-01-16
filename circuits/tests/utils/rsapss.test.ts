import { wasm as wasmTester } from 'circom_tester';
import { describe, it } from 'mocha';
import path from 'path';
import { SignatureAlgorithm } from '../../../common/src/utils/types';
import { generateMockRsaPssInputs } from './generateMockInputsRsaPss';
import { expect } from 'chai';

describe('VerifyRsapss Circuit Test', function () {
  this.timeout(0);
  const rsaAlgorithms: SignatureAlgorithm[] = [
    'rsapss_sha256_65537_4096',
    'rsapss_sha256_65537_3072',
    'rsapss_sha256_65537_2048',
    'rsapss_sha256_3_4096',
    'rsapss_sha256_3_3072',
    'rsapss_sha256_3_2048',
    'rsapss_sha512_3_4096',
    'rsapss_sha512_3_2048',
    'rsapss_sha384_65537_4096',
    'rsapss_sha384_65537_3072',
    'rsapss_sha384_3_4096',
    'rsapss_sha384_3_3072',
  ];

  rsaAlgorithms.forEach((algorithm) => {
    it(`should verify RSA-PSS signature using the circuit for ${algorithm}`, async function () {
      this.timeout(0);
      // Generate inputs using the utility function
      const { signature, modulus, message, saltLength } = generateMockRsaPssInputs(algorithm);

      // Run circuit with inputs
      const circuit = await wasmTester(
        path.join(
          __dirname,
          `../../circuits/tests/utils/rsapss/test_${algorithm}_${saltLength}.circom`
        ),
        {
          include: ['node_modules', './node_modules/@zk-kit/binary-merkle-root.circom/src'],
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

    it('Should fail to verify RSA-PSS signature with invalid signature', async function () {
      const { signature, modulus, message, saltLength } = generateMockRsaPssInputs(algorithm);

      const invalidSignature = signature.map((byte: string) => String((parseInt(byte) + 1) % 256));
      const circuit = await wasmTester(
        path.join(
          __dirname,
          `../../circuits/tests/utils/rsapss/test_${algorithm}_${saltLength}.circom`
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
      const { signature, modulus, message, saltLength } = generateMockRsaPssInputs(algorithm);

      const invalidMessage = message.map((byte: number) => String((byte + 1) % 256));
      const circuit = await wasmTester(
        path.join(
          __dirname,
          `../../circuits/tests/utils/rsapss/test_${algorithm}_${saltLength}.circom`
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
