import { expect } from 'chai';
import { wasm as wasm_tester } from 'circom_tester';
import dotenv from 'dotenv';
import path from 'path';
import serialized_csca_tree from '../../../common/pubkeys/serialized_csca_tree.json' with { type: 'json' };
import { parseCertificateSimple } from '@selfxyz/common/utils/certificate_parsing/parseCertificateSimple';
import { getCircuitNameFromPassportData } from '@selfxyz/common/utils/circuits/circuitsName';
import { generateCircuitInputsDSC } from '@selfxyz/common/utils/circuits/generateInputs';
import { genAndInitMockPassportData } from '@selfxyz/common/utils/passports/genMockPassportData';
import { parseDscCertificateData } from '@selfxyz/common/utils/passports/passport_parsing/parseDscCertificateData';
import { getLeafDscTreeFromParsedDsc } from '@selfxyz/common/utils/trees';
import { SignatureAlgorithm } from '@selfxyz/common/utils/types';
import { fullSigAlgs, sigAlgs } from './test_cases.js';
import { fileURLToPath } from 'url';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testSuite = process.env.FULL_TEST_SUITE === 'true' ? fullSigAlgs : sigAlgs;

testSuite.forEach(({ sigAlg, hashFunction, domainParameter, keyLength }) => {
  const passportData = genAndInitMockPassportData(
    hashFunction,
    hashFunction,
    `${sigAlg}_${hashFunction}_${domainParameter}_${keyLength}` as SignatureAlgorithm,
    'FRA',
    '000101',
    '300101'
  );
  const passportMetadata = passportData.passportMetadata;

  describe(`DSC chain certificate - ${passportMetadata.cscaHashFunction?.toUpperCase()} ${passportMetadata.cscaSignatureAlgorithm?.toUpperCase()} ${passportMetadata.cscaCurveOrExponent?.toUpperCase()} ${
    passportData.csca_parsed.publicKeyDetails.bits
  }`, function () {
    this.timeout(0); // Disable timeout
    let circuit;

    const inputs = generateCircuitInputsDSC(passportData, serialized_csca_tree);

    before(async () => {
      circuit = await wasm_tester(
        path.join(
          __dirname,
          `../../circuits/dsc/instances/${getCircuitNameFromPassportData(passportData, 'dsc')}.circom`
        ),
        {
          include: [
            'node_modules',
            'node_modules/@zk-kit/binary-merkle-root.circom/src',
            'node_modules/circomlib/circuits',
          ],
        }
      );
    });

    it('should compile and load the circuit', async function () {
      expect(circuit).to.not.be.undefined;
    });

    it('should compute a valid witness and output the right dsc_tree_leaf', async () => {
      const witness = await circuit.calculateWitness(inputs, true);
      await circuit.checkConstraints(witness);
      console.log('\x1b[34m%s\x1b[0m', 'witness generated ', sigAlg);

      const dsc_tree_leaf = (await circuit.getOutput(witness, ['dsc_tree_leaf'])).dsc_tree_leaf;
      console.log('\x1b[34m%s\x1b[0m', 'circom: dsc_tree_leaf: ', dsc_tree_leaf);
      expect(dsc_tree_leaf).to.be.a('string');

      const dsc_tree_leaf_js = getLeafDscTreeFromParsedDsc(passportData.dsc_parsed);
      console.log('\x1b[34m%s\x1b[0m', 'js: dsc_tree_leaf: ', dsc_tree_leaf_js);
      expect(dsc_tree_leaf).to.be.equal(dsc_tree_leaf_js);
    });

    it('should fail if raw_csca_actual_length higher than the correct length', async () => {
      try {
        const tamperedInputs = JSON.parse(JSON.stringify(inputs));
        tamperedInputs.raw_csca_actual_length = (
          Number(tamperedInputs.raw_csca_actual_length) + 1
        ).toString();

        await circuit.calculateWitness(tamperedInputs);
        expect.fail('Expected an error but none was thrown.');
      } catch (error) {
        expect(error.message).to.include('Assert Failed');
      }
    });

    it('should fail if raw_csca_actual_length lower than the correct length', async () => {
      try {
        const tamperedInputs = JSON.parse(JSON.stringify(inputs));
        tamperedInputs.raw_csca_actual_length = (
          Number(tamperedInputs.raw_csca_actual_length) - 1
        ).toString();

        await circuit.calculateWitness(tamperedInputs);
        expect.fail('Expected an error but none was thrown.');
      } catch (error) {
        expect(error.message).to.include('Assert Failed');
      }
    });

    it('should fail if raw_csca[raw_csca_actual_length - 1] is not 255', async () => {
      try {
        const tamperedInputs = JSON.parse(JSON.stringify(inputs));
        tamperedInputs.raw_csca[Number(tamperedInputs.raw_csca_actual_length) - 1] = '254';

        await circuit.calculateWitness(tamperedInputs);
        expect.fail('Expected an error but none was thrown.');
      } catch (error) {
        expect(error.message).to.include('Assert Failed');
      }
    });

    it('should fail if a byte of raw_csca after raw_csca_actual_length is not 0', async () => {
      try {
        const tamperedInputs = JSON.parse(JSON.stringify(inputs));
        tamperedInputs.raw_csca[Number(tamperedInputs.raw_csca_actual_length)] = '1';

        await circuit.calculateWitness(tamperedInputs);
        expect.fail('Expected an error but none was thrown.');
      } catch (error) {
        expect(error.message).to.include('Assert Failed');
      }
    });

    it('should fail if csca_pubKey_actual_size is lower than the minimum key length', async () => {
      try {
        const dscParsed = parseCertificateSimple(passportData.dsc);
        const dscMetadata = parseDscCertificateData(dscParsed);
        const cscaParsed = parseCertificateSimple(dscMetadata.csca);

        const tamperedInputs = JSON.parse(JSON.stringify(inputs));
        if (cscaParsed.signatureAlgorithm === 'rsa') {
          tamperedInputs.csca_pubKey_actual_size = (256 - 1).toString(); // 256 is the minimum key length for RSA
        } else {
          // for ecdsa and rsapss, the minimum key length is fixed for each circuit
          tamperedInputs.csca_pubKey_actual_size = (
            Number(tamperedInputs.csca_pubKey_actual_size) - 1
          ).toString();
        }

        await circuit.calculateWitness(tamperedInputs);
        expect.fail('Expected an error but none was thrown.');
      } catch (error) {
        expect(error.message).to.include('Assert Failed');
      }
    });

    it('should fail if csca_pubKey_offset + csca_pubKey_actual_size > raw_csca_actual_length', async () => {
      try {
        const tamperedInputs = JSON.parse(JSON.stringify(inputs));
        tamperedInputs.csca_pubKey_offset = (
          Number(tamperedInputs.raw_csca_actual_length) -
          Number(tamperedInputs.csca_pubKey_actual_size) +
          1
        ).toString();

        await circuit.calculateWitness(tamperedInputs);
        expect.fail('Expected an error but none was thrown.');
      } catch (error) {
        expect(error.message).to.include('Assert Failed');
      }
    });

    it('should fail if csca_pubKey_actual_size is larger than the key in certificate', async () => {
      try {
        const tamperedInputs = JSON.parse(JSON.stringify(inputs));
        tamperedInputs.csca_pubKey_actual_size = (
          Number(tamperedInputs.csca_pubKey_actual_size) + 8
        ).toString();

        await circuit.calculateWitness(tamperedInputs);
        expect.fail('Expected an error but none was thrown.');
      } catch (error) {
        expect(error.message).to.include('Assert Failed');
      }
    });

    it('should fail if csca_pubKey is invalid', async () => {
      try {
        const tamperedInputs = JSON.parse(JSON.stringify(inputs));
        tamperedInputs.csca_pubKey[0] = BigInt(
          Number(tamperedInputs.csca_pubKey[0]) + 1
        ).toString();

        await circuit.calculateWitness(tamperedInputs);
        expect.fail('Expected an error but none was thrown.');
      } catch (error) {
        expect(error.message).to.include('Assert Failed');
      }
    });

    it('should fail to compute a witness with an invalid merkle_root', async () => {
      try {
        const tamperedInputs = JSON.parse(JSON.stringify(inputs));
        tamperedInputs.merkle_root = BigInt(Number(tamperedInputs.merkle_root) + 1).toString();

        await circuit.calculateWitness(tamperedInputs);
        expect.fail('Expected an error but none was thrown.');
      } catch (error) {
        expect(error.message).to.include('Assert Failed');
      }
    });

    it('should fail to compute a witness with an invalid path', async () => {
      try {
        const tamperedInputs = JSON.parse(JSON.stringify(inputs));
        tamperedInputs.path[0] = BigInt(Number(tamperedInputs.path[0]) + 1).toString();

        await circuit.calculateWitness(tamperedInputs);
        expect.fail('Expected an error but none was thrown.');
      } catch (error) {
        expect(error.message).to.include('Assert Failed');
      }
    });

    it('should fail to compute a witness with an invalid merkle proof', async () => {
      try {
        const tamperedInputs = JSON.parse(JSON.stringify(inputs));
        tamperedInputs.siblings[0] = BigInt(Number(tamperedInputs.siblings[0]) + 1).toString();

        await circuit.calculateWitness(tamperedInputs);
        expect.fail('Expected an error but none was thrown.');
      } catch (error) {
        expect(error.message).to.include('Assert Failed');
      }
    });

    it('should fail to compute a witness with a dsc that is not padded with 0s after the sha padding', async () => {
      try {
        const tamperedInputs = JSON.parse(JSON.stringify(inputs));
        tamperedInputs.raw_dsc[tamperedInputs.raw_dsc.length - 1] = (
          Number(tamperedInputs.raw_dsc[tamperedInputs.raw_dsc.length - 1]) + 1
        ).toString();

        await circuit.calculateWitness(tamperedInputs);
        expect.fail('Expected an error but none was thrown.');
      } catch (error) {
        expect(error.message).to.include('Assert Failed');
      }
    });

    [64, -64, 1, -1].forEach((delta) => {
      it(`should fail to compute a witness when raw_dsc_padded_length is adjusted by ${delta}`, async () => {
        try {
          const tamperedInputs = JSON.parse(JSON.stringify(inputs));
          tamperedInputs.raw_dsc_padded_length = (
            Number(tamperedInputs.raw_dsc_padded_length) + delta
          ).toString();

          await circuit.calculateWitness(tamperedInputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error) {
          expect(error.message).to.include('Assert Failed');
        }
      });
    });

    it('should fail to compute a witness with an invalid signature', async () => {
      try {
        const tamperedInputs = JSON.parse(JSON.stringify(inputs));
        tamperedInputs.signature[0] = BigInt(Number(tamperedInputs.signature[0]) + 1).toString();

        await circuit.calculateWitness(tamperedInputs);
        expect.fail('Expected an error but none was thrown.');
      } catch (error) {
        expect(error.message).to.include('Assert Failed');
      }
    });

    it('should fail if ECDSA public key coordinates are swapped', async () => {
      try {
        const tamperedInputs = JSON.parse(JSON.stringify(inputs));
        const halfLength = tamperedInputs.csca_pubKey.length / 2;
        const firstHalf = tamperedInputs.csca_pubKey.slice(0, halfLength).reverse();
        const secondHalf = tamperedInputs.csca_pubKey.slice(halfLength).reverse();
        tamperedInputs.csca_pubKey = [...firstHalf, ...secondHalf];

        await circuit.calculateWitness(tamperedInputs);
        expect.fail('Expected an error but none was thrown.');
      } catch (error) {
        expect(error.message).to.include('Assert Failed');
      }
    });

    if (sigAlg.startsWith('rsa') || sigAlg.startsWith('rsapss')) {
      it('should fail if RSA public key prefix is invalid', async function () {
        const invalidPrefixes = [
          [0x03, 0x82, 0x01, 0x01, 0x00],
          [0x02, 0x83, 0x01, 0x01, 0x00],
          [0x02, 0x82, 0x02, 0x02, 0x00],
        ];

        for (const invalidPrefix of invalidPrefixes) {
          try {
            const tamperedInputs = JSON.parse(JSON.stringify(inputs));
            for (let i = 0; i < invalidPrefix.length; i++) {
              tamperedInputs.raw_csca[
                Number(tamperedInputs.csca_pubKey_offset) - invalidPrefix.length + i
              ] = invalidPrefix[i].toString();
            }

            await circuit.calculateWitness(tamperedInputs);
            expect.fail('Expected an error but none was thrown.');
          } catch (error: any) {
            expect(error.message).to.include('Assert Failed');
          }
        }
      });

      it('should pass with valid RSA prefix for the key length', async function () {
        const keyLengthToPrefix = {
          2048: [0x02, 0x82, 0x01, 0x01, 0x00],
          3072: [0x02, 0x82, 0x01, 0x81, 0x00],
          4096: [0x02, 0x82, 0x02, 0x01, 0x00],
        };

        const expectedPrefix = keyLengthToPrefix[passportData.csca_parsed.publicKeyDetails.bits];

        for (let i = 0; i < 5; i++) {
          const prefixByte = parseInt(inputs.raw_csca[Number(inputs.csca_pubKey_offset) - 5 + i]);
          expect(prefixByte).to.equal(
            expectedPrefix[i],
            `Prefix byte ${i} mismatch for ${passportData.csca_parsed.publicKeyDetails.bits} bit key`
          );
        }
      });
    }

    it('should not allow tampering of raw_dsc[raw_dsc_padded_length]', async () => {
      try {
        const tamperedInputs = JSON.parse(JSON.stringify(inputs));
        const paddedLength = Number(tamperedInputs.raw_dsc_padded_length);
        tamperedInputs.raw_dsc[paddedLength] = '255'; // or any nonzero value

        await circuit.calculateWitness(tamperedInputs);
        expect.fail('Expected an error but none was thrown.');
      } catch (error: any) {
        expect(error.message).to.include('Assert Failed');
      }
    });

    it('should fail if raw_csca has a signal that is longer than a byte', async function () {
      try {
        const tamperedInputs = JSON.parse(JSON.stringify(inputs));
        tamperedInputs.raw_csca[0] = (parseInt(tamperedInputs.raw_csca[0], 10) + 256).toString();
        await circuit.calculateWitness(tamperedInputs);
        expect.fail('Expected an error but none was thrown.');
      } catch (error: any) {
        expect(error.message).to.include('Assert Failed');
      }
    });
  });
});
