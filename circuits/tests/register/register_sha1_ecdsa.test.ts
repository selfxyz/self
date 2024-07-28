import { expect } from 'chai';
import { describe } from 'mocha';
import path from 'path';
import { poseidon1 } from 'poseidon-lite';
import { mockPassPortData_sha1_ecdsa } from '../../../common/src/constants/mockPassportData';
import { generateCircuitInputsRegister } from '../../../common/src/utils/generateInputs';
import { extractRSFromSignature, hexToDecimal } from '../../../common/src/utils/utils';
const wasm_tester = require('circom_tester').wasm;

function bigint_to_array(n: number, k: number, x: bigint) {
  let mod: bigint = 1n;
  for (var idx = 0; idx < n; idx++) {
    mod = mod * 2n;
  }

  let ret: bigint[] = [];
  var x_temp: bigint = x;
  for (var idx = 0; idx < k; idx++) {
    ret.push(x_temp % mod);
    x_temp = x_temp / mod;
  }
  return ret;
}

describe('Register - SHA1 WITH ECDSA', function () {
  this.timeout(0);
  let inputs: any;
  let circuit: any;
  let passportData = mockPassPortData_sha1_ecdsa;
  let attestation_id: string;
  const attestation_name = 'E-PASSPORT';
  const n_dsc = 43; // 43 * 6 = 258 > 254 Cirom field size
  const k_dsc = 6;

  const secret = BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString();
  const dscSecret = BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString();
  attestation_id = poseidon1([BigInt(Buffer.from(attestation_name).readUIntBE(0, 6))]).toString();

  inputs = generateCircuitInputsRegister(
    secret,
    dscSecret,
    attestation_id,
    passportData,
    n_dsc,
    k_dsc
  );

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

  it('should verify inputs with ecdsa sha256', async function () {
    let qx = BigInt(hexToDecimal(inputs.dsc_modulus[0]));
    let qy = BigInt(hexToDecimal(inputs.dsc_modulus[1]));
    let dsc_modulus = [bigint_to_array(43, 6, qx), bigint_to_array(43, 6, qy)];

    let signature = inputs.signature;
    let { r, s } = extractRSFromSignature(signature);
    let signature_r = bigint_to_array(43, 6, BigInt(hexToDecimal(r)));
    let signature_s = bigint_to_array(43, 6, BigInt(hexToDecimal(s)));

    // console.log('dsc_modulus', dsc_modulus);
    // console.log('signature_r', signature_r);
    // console.log('signature_s', signature_s);
    // console.log('dg1_hash', inputs.dg1_hash_offset);
    // console.log('econtent', inputs.econtent);

    const witness = await circuit.calculateWitness({
      mrz: inputs.mrz,
      dg1_hash_offset: inputs.dg1_hash_offset[0],
      dataHashes: inputs.econtent,
      datahashes_padded_length: inputs.datahashes_padded_length[0],
      eContentBytes: inputs.signed_attributes,
      dsc_modulus: dsc_modulus,
      signature_r: signature_r,
      signature_s: signature_s,
    });
  });
});
