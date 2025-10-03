import { expect } from 'chai';
import { wasm as wasm_tester } from 'circom_tester';
import dotenv from 'dotenv';
import { describe } from 'mocha';
import path from 'path';
import { poseidon6 } from 'poseidon-lite';
import serialized_dsc_tree from '@selfxyz/common/pubkeys/serialized_dsc_tree.json' with { type: 'json' };
import { PASSPORT_ATTESTATION_ID } from '@selfxyz/common/constants/constants';
import { parseCertificateSimple } from '@selfxyz/common/utils/certificate_parsing/parseCertificateSimple';
import { getCircuitNameFromPassportData } from '@selfxyz/common/utils/circuits/circuitsName';
import { generateCircuitInputsRegisterForTests } from '@selfxyz/common/utils/circuits/generateInputs';
import { genAndInitMockPassportData } from '@selfxyz/common/utils/passports/genMockPassportData';
import { generateCommitment, generateNullifier } from '@selfxyz/common/utils/passports/passport';
import { SignatureAlgorithm } from '@selfxyz/common/utils/types';
import { fullSigAlgs, sigAlgs } from './test_cases.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();

const testSuite = process.env.FULL_TEST_SUITE === 'true' ? fullSigAlgs : sigAlgs;

testSuite.forEach(
  ({
    dgHashAlgo,
    eContentHashAlgo,
    sigAlg,
    hashFunction,
    domainParameter,
    keyLength,
    saltLength,
  }) => {
    describe(`Register - ${dgHashAlgo.toUpperCase()} ${eContentHashAlgo.toUpperCase()} ${hashFunction.toUpperCase()} ${sigAlg.toUpperCase()} ${
      domainParameter
    } ${keyLength}${saltLength ? ` Salt:${saltLength}` : ''}`, function () {
      this.timeout(0);
      let circuit: any;

      const passportData = genAndInitMockPassportData(
        dgHashAlgo,
        eContentHashAlgo,
        `${sigAlg}_${hashFunction}_${domainParameter}_${keyLength}${saltLength ? `_${saltLength}` : ''}` as SignatureAlgorithm,
        'FRA',
        '000101',
        '300101'
      );

      const secret = poseidon6('SECRET'.split('').map((x) => BigInt(x.charCodeAt(0)))).toString();

      const inputs = generateCircuitInputsRegisterForTests(
        secret,
        passportData,
        serialized_dsc_tree as string
      );

      before(async () => {
        circuit = await wasm_tester(
          path.join(
            __dirname,
            `../../circuits/register/instances/${getCircuitNameFromPassportData(passportData, 'register')}.circom`
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

      it('should calculate the witness with correct inputs, and have the right nullifier and commitment', async function () {
        const w = await circuit.calculateWitness(inputs);
        await circuit.checkConstraints(w);

        const nullifier_js = generateNullifier(passportData);
        console.log('\x1b[35m%s\x1b[0m', 'js: nullifier:', nullifier_js);
        const nullifier = (await circuit.getOutput(w, ['nullifier'])).nullifier;
        console.log('\x1b[34m%s\x1b[0m', 'circom: nullifier', nullifier);
        expect(nullifier).to.be.equal(nullifier_js);

        const commitment_js = generateCommitment(
          secret.toString(),
          PASSPORT_ATTESTATION_ID,
          passportData
        );
        console.log('\x1b[35m%s\x1b[0m', 'js: commitment:', commitment_js);
        const commitment = (await circuit.getOutput(w, ['commitment'])).commitment;
        console.log('\x1b[34m%s\x1b[0m', 'circom commitment', commitment);
        expect(commitment).to.be.equal(commitment_js);
      });

      it('should fail if dsc_pubKey_actual_size is lower than the minimum key length', async () => {
        try {
          const dscParsed = parseCertificateSimple(passportData.dsc);

          const tamperedInputs = JSON.parse(JSON.stringify(inputs));
          if (dscParsed.signatureAlgorithm === 'rsa') {
            tamperedInputs.dsc_pubKey_actual_size = (256 - 1).toString(); // 256 is the minimum key length for RSA
          } else {
            // for ecdsa and rsapss, the minimum key length is fixed for each circuit
            tamperedInputs.dsc_pubKey_actual_size = (
              Number(tamperedInputs.dsc_pubKey_actual_size) - 1
            ).toString();
          }

          await circuit.calculateWitness(tamperedInputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error) {
          expect(error.message).to.include('Assert Failed');
        }
      });

      // ----- Tests for dsc_pubKey offset and size checks -----
      it('should fail if dsc_pubKey_offset + dsc_pubKey_actual_size > raw_dsc_actual_length', async function () {
        try {
          const tamperedInputs = JSON.parse(JSON.stringify(inputs));
          tamperedInputs.dsc_pubKey_offset = (
            Number(tamperedInputs.raw_dsc_actual_length) -
            Number(tamperedInputs.dsc_pubKey_actual_size) +
            1
          ).toString();
          await circuit.calculateWitness(tamperedInputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error: any) {
          expect(error.message).to.include('Assert Failed');
        }
      });

      it('should fail if dsc_pubKey_actual_size is larger than the actual key size in certificate', async function () {
        try {
          const tamperedInputs = JSON.parse(JSON.stringify(inputs));
          tamperedInputs.dsc_pubKey_actual_size = (
            Number(tamperedInputs.dsc_pubKey_actual_size) + 8
          ).toString();
          await circuit.calculateWitness(tamperedInputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error: any) {
          expect(error.message).to.include('Assert Failed');
        }
      });

      // ----- Tests for Merkle tree inclusion -----
      it('should fail if merkle_root is invalid', async function () {
        try {
          const tamperedInputs = JSON.parse(JSON.stringify(inputs));
          tamperedInputs.merkle_root = (BigInt(tamperedInputs.merkle_root) + 1n).toString();
          await circuit.calculateWitness(tamperedInputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error: any) {
          expect(error.message).to.include('Assert Failed');
        }
      });

      it('should fail if leaf_depth is tampered', async function () {
        try {
          const tamperedInputs = JSON.parse(JSON.stringify(inputs));
          // Change leaf_depth to an incorrect value (e.g., add 1)
          tamperedInputs.leaf_depth = (Number(tamperedInputs.leaf_depth) + 1).toString();
          await circuit.calculateWitness(tamperedInputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error: any) {
          expect(error.message).to.include('Assert Failed');
        }
      });

      it('should fail if a value in the merkle path is invalid', async function () {
        try {
          const tamperedInputs = JSON.parse(JSON.stringify(inputs));
          tamperedInputs.path[0] = (BigInt(tamperedInputs.path[0]) + 1n).toString();
          await circuit.calculateWitness(tamperedInputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error: any) {
          expect(error.message).to.include('Assert Failed');
        }
      });

      it('should fail if a sibling in the merkle proof is invalid', async function () {
        try {
          const tamperedInputs = JSON.parse(JSON.stringify(inputs));
          tamperedInputs.siblings[0] = (BigInt(tamperedInputs.siblings[0]) + 1n).toString();
          await circuit.calculateWitness(tamperedInputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error: any) {
          expect(error.message).to.include('Assert Failed');
        }
      });

      // ----- Tests for passport signature and data integrity -----
      it('should fail to calculate witness with invalid mrz', async function () {
        try {
          const ininputs = {
            ...inputs,
            dg1: Array(93)
              .fill(0)
              .map((byte) => BigInt(byte).toString()),
          };
          await circuit.calculateWitness(ininputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error) {
          expect(error.message).to.include('Assert Failed');
        }
      });

      it('should fail to calculate witness with invalid eContent', async function () {
        try {
          const ininputs = {
            ...inputs,
            eContent: inputs.eContent.map((byte: string) => String((parseInt(byte, 10) + 1) % 256)),
          };
          await circuit.calculateWitness(ininputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error) {
          expect(error.message).to.include('Assert Failed');
        }
      });

      it('should fail if signed_attr is invalid', async function () {
        try {
          const tamperedInputs = JSON.parse(JSON.stringify(inputs));
          tamperedInputs.signed_attr = tamperedInputs.signed_attr.map((byte: string) =>
            ((parseInt(byte, 10) + 1) % 256).toString()
          );
          await circuit.calculateWitness(tamperedInputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error: any) {
          expect(error.message).to.include('Assert Failed');
        }
      });

      it('should fail if signature_passport is invalid', async function () {
        try {
          const tamperedInputs = JSON.parse(JSON.stringify(inputs));
          tamperedInputs.signature_passport = tamperedInputs.signature_passport.map(
            (byte: string) => ((parseInt(byte, 10) + 1) % 256).toString()
          );
          await circuit.calculateWitness(tamperedInputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error: any) {
          expect(error.message).to.include('Assert Failed');
        }
      });

      // ----- Test for tampering with csca_hash (used in commitment) -----
      it('should fail if csca_hash is tampered', async function () {
        try {
          const tamperedInputs = JSON.parse(JSON.stringify(inputs));
          tamperedInputs.csca_tree_leaf = (BigInt(tamperedInputs.csca_tree_leaf) + 1n).toString();
          await circuit.calculateWitness(tamperedInputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error: any) {
          expect(error.message).to.include('Assert Failed');
        }
      });

      // ----- Test for tampering with secret (affects commitment and nullifier) -----
      it('should compute different outputs if secret is changed', async function () {
        const wValid = await circuit.calculateWitness(inputs);
        await circuit.checkConstraints(wValid);
        const nullifierValid = (await circuit.getOutput(wValid, ['nullifier'])).nullifier;
        const commitmentValid = (await circuit.getOutput(wValid, ['commitment'])).commitment;

        const tamperedInputs = { ...inputs, secret: (BigInt(inputs.secret[0]) + 1n).toString() };
        const wTampered = await circuit.calculateWitness(tamperedInputs);
        await circuit.checkConstraints(wTampered);
        const nullifierTampered = (await circuit.getOutput(wTampered, ['nullifier'])).nullifier;
        const commitmentTampered = (await circuit.getOutput(wTampered, ['commitment'])).commitment;

        expect(nullifierTampered).to.equal(nullifierValid);
        expect(commitmentTampered).to.not.be.equal(commitmentValid);
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
                tamperedInputs.raw_dsc[
                  Number(tamperedInputs.dsc_pubKey_offset) - invalidPrefix.length + i
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

          const expectedPrefix = keyLengthToPrefix[keyLength];

          for (let i = 0; i < 5; i++) {
            const prefixByte = parseInt(inputs.raw_dsc[Number(inputs.dsc_pubKey_offset) - 5 + i]);
            expect(prefixByte).to.equal(
              expectedPrefix[i],
              `Prefix byte ${i} mismatch for ${keyLength} bit key`
            );
          }
        });
      }

      it('should fail if raw_dsc has a signal that is longer than a byte', async function () {
        try {
          const tamperedInputs = JSON.parse(JSON.stringify(inputs));
          tamperedInputs.raw_dsc[0] = (parseInt(tamperedInputs.raw_dsc[0], 10) + 256).toString();
          await circuit.calculateWitness(tamperedInputs);
          expect.fail('Expected an error but none was thrown.');
        } catch (error: any) {
          expect(error.message).to.include('Assert Failed');
        }
      });
    });
  }
);
