import { wasm as wasmTester } from 'circom_tester';
import { describe, it } from 'mocha';
import path from 'path';
import { generateMockRsaPkcs1v1_5Inputs } from './generateMockInputsInCircuits';
import { SignatureAlgorithm } from '../../../common/src/utils/types';

describe('VerifyRsaPkcs1v1_5 Circuit Test', function () {
  this.timeout(0);
  /** Some tests are disabled to avoid overloading the CI/CD pipeline - the commented rsa verifications will however be tested in prove.test.ts and dsc.test.ts **/
  const rsaAlgorithms: SignatureAlgorithm[] = [
    // 'rsa_sha1_65537_2048',
    // 'rsa_sha256_65537_2048',
    // 'rsa_sha256_3_2048',
    // 'rsa_sha256_65537_3072',
    'rsa_sha256_65537_4096',
    'rsa_sha512_65537_4096',
  ];

  /*
    // rsa	65537	sha1 4096
    // rsa 65537 sha1 2048
    rsa	3	sha256 4096
    // rsa 3 sha256 2048
    // rsa	65537	sha256 4096
    // rsa	65537	sha256 2048
    // rsa	65537	sha256 3072
    // rsa	65537	sha512 4096
    // rsa	65537	sha512 2048		
  */

  rsaAlgorithms.forEach((algorithm) => {
    it(`should verify RSA signature using the circuit for ${algorithm}`, async function () {
      // Generate inputs using the utility function
      const { signature, modulus, message } = generateMockRsaPkcs1v1_5Inputs(algorithm);

      // Run circuit with inputs
      const circuit = await wasmTester(
        path.join(__dirname, `../../circuits/tests/utils/rsa/test_${algorithm}.circom`),
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
