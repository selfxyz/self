import { expect } from 'chai';
import path from 'path';
const wasm_tester = require('circom_tester').wasm;
import {
  mockPassportData_sha256_rsa_65537,
  mockPassportData2_sha256_rsa_65537,
} from '../../../common/src/constants/mockPassportData';
import { generateCircuitInputsCountryVerifier } from '../../../common/src/utils/generateInputs';
import { getLeaf } from '../../../common/src/utils/pubkeyTree';
import { SMT, ChildNodes } from '@ashpect/smt'
import { poseidon1, poseidon2, poseidon3, poseidon6 } from 'poseidon-lite';
import { LeanIMT } from '@zk-kit/lean-imt';
import { formatMrz, packBytes } from '../../../common/src/utils/utils';
import scSmtJson from '../../../common/sanctionedCountries/outputs/sc_SMT.json';
import { PassportData } from '../../../common/src/utils/types';;

let circuit: any;
let passportData = mockPassportData_sha256_rsa_65537; // Country is France which is not in us sanctioned list
let passportData2 = mockPassportData2_sha256_rsa_65537; // Country is Cuba which is in us sanctioned list
let tree: LeanIMT;
const hash = (childNodes: ChildNodes) =>
  childNodes.length === 2 ? poseidon2(childNodes) : poseidon3(childNodes);

// Calculating common validatidy inputs for all 3 ciruits
function getPassportInputs(passportData: PassportData) {
  const secret = BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString();
  const attestation_name = 'E-PASSPORT';
  const attestation_id = poseidon1([
    BigInt(Buffer.from(attestation_name).readUIntBE(0, 6)),
  ]).toString();

  const majority = '18';
  const user_identifier = '0xE6E4b6a802F2e0aeE5676f6010e0AF5C9CDd0a50';
  const bitmap = Array(90).fill('1');
  const scope = poseidon1([BigInt(Buffer.from('VOTEEEEE').readUIntBE(0, 6))]).toString();

  const pubkey_leaf = getLeaf({
    signatureAlgorithm: passportData.signatureAlgorithm,
    modulus: passportData.pubKey.modulus,
    exponent: passportData.pubKey.exponent,
  }).toString();
  const mrz_bytes = packBytes(formatMrz(passportData.mrz));
  const commitment = poseidon6([
    secret,
    attestation_id,
    pubkey_leaf,
    mrz_bytes[0],
    mrz_bytes[1],
    mrz_bytes[2],
  ]);

  return {
    secret: secret,
    attestation_id: attestation_id,
    passportData: passportData,
    commitment: commitment,
    majority: majority,
    bitmap: bitmap,
    scope: scope,
    user_identifier: user_identifier,
  };
}
const validInputs = getPassportInputs(passportData);
const invalidInputs = getPassportInputs(passportData2);

tree = new LeanIMT((a, b) => poseidon2([a, b]), []);
tree.insert(BigInt(validInputs.commitment));
tree.insert(BigInt(invalidInputs.commitment));

describe('start testing ofac_passportNo_verifier.circom', function () {
  this.timeout(0);
  let sc_smt = new SMT(hash, true);
  let memSmtInputs: any;
  let nonMemSmtInputs: any;

  before(async () => {
    circuit = await wasm_tester(
      path.join(__dirname, '../../circuits/disclose/country_verifier.circom'),
      {
        include: [
          'node_modules',
          './node_modules/@zk-kit/binary-merkle-root.circom/src',
          './node_modules/circomlib/circuits',
        ],
      }
    );

    sc_smt.import(scSmtJson);

    nonMemSmtInputs = generateCircuitInputsCountryVerifier(
      // proof of membership, USA-FRA pair (FRA is not in USA sanctioned list)
      validInputs.secret,
      validInputs.attestation_id,
      validInputs.passportData,
      tree,
      validInputs.majority,
      validInputs.bitmap,
      validInputs.scope,
      validInputs.user_identifier,
      sc_smt,
    );

    memSmtInputs = generateCircuitInputsCountryVerifier(
      // proof of non-membership, USA-CUB pair (CUB is in USA sanctioned list)
      invalidInputs.secret,
      invalidInputs.attestation_id,
      invalidInputs.passportData,
      tree,
      invalidInputs.majority,
      invalidInputs.bitmap,
      invalidInputs.scope,
      invalidInputs.user_identifier,
      sc_smt,
    );
  });

  // Compile circuit
  it('should compile and load the circuit, level 3', async function () {
    expect(circuit).to.not.be.undefined;
  });

  // Corrct siblings and closest leaf : Everything correct as a proof
  it('should pass without errors , all conditions satisfied', async function () {
    let w = await circuit.calculateWitness(nonMemSmtInputs);
    console.log('Everything correct, Valid proof of non-membership !!');
  });

  // Correct siblings but membership proof : Fail at proofType == 0(non-mem) assertion
  it('should fail to calculate witness since trying to generate membership proof, level 3', async function () {
    try {
      await circuit.calculateWitness(memSmtInputs);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
      expect(error.message).to.not.include('SMTVerify');
    }
  });

  // Give wrong closest leaf but correct siblings array : Fail of SMT Verification
  it('should fail to calculate witness due to wrong closest_leaf provided, level 3', async function () {
    try {
      let wrongSibInputs = nonMemSmtInputs;
      const randomNumber = Math.floor(Math.random() * Math.pow(2, 254));
      wrongSibInputs.closest_leaf = BigInt(randomNumber).toString();
      await circuit.calculateWitness(wrongSibInputs);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
      expect(error.message).to.include('SMTVerify');
    }
  });
});
