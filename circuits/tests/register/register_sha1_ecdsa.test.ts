import { expect } from 'chai';
import { describe } from 'mocha';
import path from 'path';
import { poseidon1 } from 'poseidon-lite';
import { mockPassPortData_sha1_ecdsa } from '../../../common/src/constants/mockPassportData';
const wasm_tester = require('circom_tester').wasm;

describe('Register - SHA1 WITH ECDSA', function () {
  this.timeout(0);
  let inputs: any;
  let circuit: any;
  let passportData = mockPassPortData_sha1_ecdsa;
  let attestation_id: string;
  const attestation_name = 'E-PASSPORT';
  const n_dsc = 121;
  const k_dsc = 17;

  const secret = BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString();
  const dscSecret = BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString();

  attestation_id = poseidon1([BigInt(Buffer.from(attestation_name).readUIntBE(0, 6))]).toString();

  // TODO - Fix this generate circuit inputs to support qx and qy publicKey for ECDSA
  // inputs = generateCircuitInputsRegister(
  //   secret,
  //   dscSecret,
  //   attestation_id,
  //   passportData,
  //   n_dsc,
  //   k_dsc
  // );
  before(async () => {
    circuit = await wasm_tester(
      path.join(
        __dirname,
        '../../circuits/register/verifier/passport_verifier_ecdsaWithSHA1Encryption.circom'
      ),
      {
        include: [
          'node_modules',
          './node_modules/@zk-kit/binary-merkle-root.circom/src',
          './node_modules/circomlib/circuits',
          './node_modules/dmpierre/sha1-circom/circuits',
        ],
      }
    );
  });

  it('should compile and load the circuit', async function () {
    expect(circuit).to.not.be.undefined;
  });
});
