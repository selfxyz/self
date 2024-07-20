import { expect } from 'chai';
import { describe } from 'mocha';
import path from 'path';

import { p256 } from '@noble/curves/p256';
import { SignatureType } from '@noble/curves/abstract/weierstrass';
const wasm_tester = require('circom_tester').wasm;

function bigint_to_Uint8Array(x: bigint) {
  var ret: Uint8Array = new Uint8Array(32);
  for (var idx = 31; idx >= 0; idx--) {
    ret[idx] = Number(x % 256n);
    x = x / 256n;
  }
  return ret;
}

function bigint_to_tuple(x: bigint) {
  let mod: bigint = 2n ** 43n;
  let ret = [0n, 0n, 0n, 0n, 0n, 0n];

  var x_temp: bigint = x;
  for (var idx = 0; idx < ret.length; idx++) {
    ret[idx] = x_temp % mod;
    x_temp = x_temp / mod;
  }
  return ret;
}

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

  var test_cases: Array<[bigint, bigint, bigint, bigint]> = [];

  // let inputs: any;
  let circuit: any;
  // let passportData = mockPassPortData_sha1_ecdsa;
  // let attestation_id: string;
  // const attestation_name = 'E-PASSPORT';
  // const n_dsc = 121;
  // const k_dsc = 17;

  // const secret = BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString();
  // const dscSecret = BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString();

  // attestation_id = poseidon1([BigInt(Buffer.from(attestation_name).readUIntBE(0, 6))]).toString();

  // TODO - Fix this generate circuit inputs to support qx and qy publicKey for ECDSA
  // inputs = generateCircuitInputsRegister(
  //   secret,
  //   dscSecret,
  //   attestation_id,
  //   passportData,
  //   n_dsc,
  //   k_dsc
  // );

  var test_cases: Array<[bigint, bigint, bigint, bigint]> = [];
  var privkeys: Array<bigint> = [
    88549154299169935420064281163296845505587953610183896504176354567359434168161n,
    37706893564732085918706190942542566344879680306879183356840008504374628845468n,
    90388020393783788847120091912026443124559466591761394939671630294477859800601n,
    110977009687373213104962226057480551605828725303063265716157300460694423838923n,
  ];

  for (var idx = 0; idx < privkeys.length; idx++) {
    var pubkey = p256.ProjectivePoint.fromPrivateKey(privkeys[idx]);
    var msghash_bigint: bigint = 1234n;
    test_cases.push([privkeys[idx], msghash_bigint, pubkey.x, pubkey.y]);
  }

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

  var test_ecdsa_verify = function (test_case: [bigint, bigint, bigint, bigint]) {
    let privkey = test_case[0];
    let msghash_bigint = test_case[1];
    let pub0 = test_case[2];
    let pub1 = test_case[3];

    var msghash: Uint8Array = bigint_to_Uint8Array(msghash_bigint);

    it(
      'Testing correct sig: privkey: ' +
        privkey +
        ' msghash: ' +
        msghash_bigint +
        ' pub0: ' +
        pub0 +
        ' pub1: ' +
        pub1,
      async function () {
        // in compact format: r (big-endian), 32-bytes + s (big-endian), 32-bytes
        var sig: SignatureType = p256.sign(msghash, privkey);

        var r: bigint = sig.r;
        var s: bigint = sig.s;

        var priv_array: bigint[] = bigint_to_array(43, 6, privkey);
        var r_array: bigint[] = bigint_to_array(43, 6, r);
        var s_array: bigint[] = bigint_to_array(43, 6, s);
        var msghash_array: bigint[] = bigint_to_array(43, 6, msghash_bigint);
        var pub0_array: bigint[] = bigint_to_array(43, 6, pub0);
        var pub1_array: bigint[] = bigint_to_array(43, 6, pub1);
        var res = 1n;

        let inputs = {
          r: r_array,
          s: s_array,
          msghash: msghash_array,
          pubkey: [pub0_array, pub1_array],
        };
        console.log(inputs);
        let witness = await circuit.calculateWitness(inputs);
        // expect(witness[1]).to.equal(res);
        await circuit.checkConstraints(witness);
      }
    );
  };

  test_ecdsa_verify(test_cases[0]);
  // test_cases.forEach(test_ecdsa_verify);
});
