import { wasm as wasmTester } from 'circom_tester';
import { describe, it } from 'mocha';
import path from 'path';
import { SignatureAlgorithm } from '../../../common/src/utils/types';
import { generateMockRsaPssInputs } from './generateMockInputsRsaPss';

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
    it(`should verify RSA signature using the circuit for ${algorithm}`, async function () {
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
  });
});
