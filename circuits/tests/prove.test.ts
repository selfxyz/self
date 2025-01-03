import { describe } from 'mocha';
import { expect } from 'chai';
import path from 'path';
import { wasm as wasm_tester } from 'circom_tester';
import { generateCircuitInputsProve } from '../../common/src/utils/generateInputs';
import { genMockPassportData } from '../../common/src/utils/genMockPassportData';
import { getCircuitName } from '../../common/src/utils/certificates/handleCertificate';
import { SignatureAlgorithm } from '../../common/src/utils/types';
import crypto from 'crypto';
import { poseidon2 } from 'poseidon-lite';
import { SMT } from '@openpassport/zk-kit-smt';
import namejson from '../../common/ofacdata/outputs/nameSMT.json';
import { log } from 'console';

const sigAlgs = [
  // { sigAlg: 'rsa', hashFunction: 'sha1', domainParameter: '65537', keyLength: '2048' },
  // { sigAlg: 'rsa', hashFunction: 'sha256', domainParameter: '65537', keyLength: '2048' },
  // { sigAlg: 'rsapss', hashFunction: 'sha256', domainParameter: '65537', keyLength: '2048' },
  // { sigAlg: 'rsapss', hashFunction: 'sha256', domainParameter: '65537', keyLength: '3072' },
  // { sigAlg: 'rsapss', hashFunction: 'sha256', domainParameter: '65537', keyLength: '4096' },
  // { sigAlg: 'rsapss', hashFunction: 'sha256', domainParameter: '3', keyLength: '4096' },
  // { sigAlg: 'rsapss', hashFunction: 'sha256', domainParameter: '3', keyLength: '3072' },
  // { sigAlg: 'rsa', hashFunction: 'sha256', domainParameter: '3', keyLength: '2048' },
  // { sigAlg: 'rsa', hashFunction: 'sha256', domainParameter: '65537', keyLength: '3072' },
  // { sigAlg: 'ecdsa', hashFunction: 'sha1', domainParameter: 'brainpoolP224r1', keyLength: '224' },
  // { sigAlg: 'ecdsa', hashFunction: 'sha256', domainParameter: 'brainpoolP224r1', keyLength: '224' },
  // { sigAlg: 'ecdsa', hashFunction: 'sha256', domainParameter: 'secp256r1', keyLength: '256' },
  // { sigAlg: 'ecdsa', hashFunction: 'sha1', domainParameter: 'secp256r1', keyLength: '256' },
  // { sigAlg: 'ecdsa', hashFunction: 'sha256', domainParameter: 'brainpoolP256r1', keyLength: '256' },
  // { sigAlg: 'ecdsa', hashFunction: 'sha384', domainParameter: 'brainpoolP256r1', keyLength: '256' },
  { sigAlg: 'ecdsa', hashFunction: 'sha512', domainParameter: 'brainpoolP256r1', keyLength: '256' },
  // { sigAlg: 'ecdsa', hashFunction: 'sha384', domainParameter: 'secp384r1', keyLength: '384' },
  // { sigAlg: 'ecdsa', hashFunction: 'sha256', domainParameter: 'secp384r1', keyLength: '384' },
  // { sigAlg: 'ecdsa', hashFunction: 'sha384', domainParameter: 'brainpoolP384r1', keyLength: '384' },
  // { sigAlg: 'ecdsa', hashFunction: 'sha512', domainParameter: 'brainpoolP384r1', keyLength: '384' },
];

sigAlgs.forEach(({ sigAlg, hashFunction, domainParameter, keyLength }) => {
  describe(`Prove - ${hashFunction.toUpperCase()} ${sigAlg.toUpperCase()} ${domainParameter} ${keyLength}`, function () {
    this.timeout(0);
    let circuit: any;

    const passportData = genMockPassportData(
      `${sigAlg}_${hashFunction}_${domainParameter}_${keyLength}` as SignatureAlgorithm,
      'FRA',
      '000101',
      '300101'
    );

    const majority = '18';
    const user_identifier = crypto.randomUUID();
    const scope = '@coboyApp';
    const selector_dg1 = Array(88).fill('1');
    const selector_older_than = '1';
    const secret = 0;
    const dsc_secret = 0;
    const selector_mode = [1, 1];
    const selector_ofac = 1;
    const forbidden_countries_list = ['DZA'];

    let name_smt = new SMT(poseidon2, true);
    name_smt.import(namejson);
    const inputs = generateCircuitInputsProve(
      selector_mode,
      secret,
      dsc_secret,
      passportData,
      scope,
      selector_dg1,
      selector_older_than,
      majority,
      name_smt,
      selector_ofac,
      forbidden_countries_list,
      user_identifier
    );

    before(async () => {
      circuit = await wasm_tester(
        path.join(
          __dirname,
          `../circuits/prove/instances/${getCircuitName('prove', sigAlg, hashFunction, domainParameter, keyLength)}.circom`
        )
      );
    });

    it('should compile and load the circuit', async function () {
      expect(circuit).to.not.be.undefined;
    });

    it('should calculate the witness with correct inputs', async function () {
      const w = await circuit.calculateWitness(inputs);
      await circuit.checkConstraints(w);
      // circuits.getOutput takes way too long for ecdsa
      if (sigAlg === 'ecdsa') {
        console.log('skipping printing outputs to console for ecdsa');
        return;
      }

      const nullifier = (await circuit.getOutput(w, ['nullifier'])).nullifier;
      console.log('\x1b[34m%s\x1b[0m', 'nullifier', nullifier);
      const commitment = (await circuit.getOutput(w, ['commitment'])).commitment;
      console.log('\x1b[34m%s\x1b[0m', 'commitment', commitment);
      const blinded_dsc_commitment = (await circuit.getOutput(w, ['blinded_dsc_commitment']))
        .blinded_dsc_commitment;
      console.log('\x1b[34m%s\x1b[0m', 'blinded_dsc_commitment', blinded_dsc_commitment);

      const ofac_result = (await circuit.getOutput(w, ['ofac_result'])).ofac_result;
      console.log('\x1b[34m%s\x1b[0m', 'ofac_result', ofac_result);

      expect(blinded_dsc_commitment).to.be.not.null;
      expect(nullifier).to.be.not.null;
    });

    // it('should fail to calculate witness with invalid mrz', async function () {
    //   try {
    //     const invalidInputs = {
    //       ...inputs,
    //       dg1: Array(93)
    //         .fill(0)
    //         .map((byte) => BigInt(byte).toString()),
    //     };
    //     await circuit.calculateWitness(invalidInputs);
    //     expect.fail('Expected an error but none was thrown.');
    //   } catch (error) {
    //     expect(error.message).to.include('Assert Failed');
    //   }
    // });

    // it('should fail to calculate witness with invalid eContent', async function () {
    //   try {
    //     const invalidInputs = {
    //       ...inputs,
    //       eContent: inputs.eContent.map((byte: string) => String((parseInt(byte, 10) + 1) % 256)),
    //     };
    //     await circuit.calculateWitness(invalidInputs);
    //     expect.fail('Expected an error but none was thrown.');
    //   } catch (error) {
    //     expect(error.message).to.include('Assert Failed');
    //   }
    // });

    // it('should fail to calculate witness with invalid signature', async function () {
    //   try {
    //     const invalidInputs = {
    //       ...inputs,
    //       signature: inputs.signature.map((byte: string) => String((parseInt(byte, 10) + 1) % 256)),
    //     };
    //     await circuit.calculateWitness(invalidInputs);
    //     expect.fail('Expected an error but none was thrown.');
    //   } catch (error) {
    //     expect(error.message).to.include('Assert Failed');
    //   }
    // });
  });
});
