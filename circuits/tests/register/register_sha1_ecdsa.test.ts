import { describe } from 'mocha';
import { poseidon1 } from 'poseidon-lite';
import { mockPassPortData_sha1_ecdsa } from '../../../common/src/constants/mockPassportData';
import { generateCircuitInputsRegister } from '../../../common/src/utils/generateInputs';
import { extractRSFromSignature } from '../../../common/src/utils/utils';
const wasm_tester = require('circom_tester').wasm;
import elliptic from 'elliptic';
import * as crypto from 'crypto';

describe('Register - SHA1 WITH ECDSA', function () {
  this.timeout(0);
  let inputs: any;
  let circuit: any;
  let passportData = mockPassPortData_sha1_ecdsa;
  let attestation_id: string;
  const attestation_name = 'E-PASSPORT';
  const n_dsc = 43;
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

  let qx = inputs.dsc_modulus[0];
  let qy = inputs.dsc_modulus[1];
  let signature = inputs.signature;

  const ec = new elliptic.ec('p256');
  const key = ec.keyFromPublic({ x: qx, y: qy }, 'hex');

  const messageBuffer = Buffer.from(inputs.signed_attributes);
  const msgHash = crypto.createHash('sha1').update(messageBuffer).digest();

  const isValid = key.verify(msgHash, signature);

  console.log('isVerified', isValid);

  let { r, s } = extractRSFromSignature(inputs.signature);
  console.log('r', r);
  console.log('s', s);
  // console.log(extractRSFromSignature(inputs.signature));
  // let sui = Buffer.from(inputs.signature);
  // console.log(sui);
  // var test_cases: Array<[bigint, bigint, bigint, bigint]> = [];
  // var privkeys: Array<bigint> = [
  //   88549154299169935420064281163296845505587953610183896504176354567359434168161n,
  //   37706893564732085918706190942542566344879680306879183356840008504374628845468n,
  //   90388020393783788847120091912026443124559466591761394939671630294477859800601n,
  //   110977009687373213104962226057480551605828725303063265716157300460694423838923n,
  // ];

  // for (var idx = 0; idx < privkeys.length; idx++) {
  //   var pubkey = p256.ProjectivePoint.fromPrivateKey(privkeys[idx]);
  //   var msghash_bigint: bigint = 1234n;
  //   test_cases.push([privkeys[idx], msghash_bigint, pubkey.x, pubkey.y]);
  // }

  // before(async () => {
  //   circuit = await wasm_tester(
  //     path.join(
  //       __dirname,
  //       '../../circuits/register/verifier/passport_verifier_ecdsaWithSHA1Encryption.circom'
  //     ),
  //     {
  //       include: [
  //         'node_modules',
  //         './node_modules/@zk-kit/binary-merkle-root.circom/src',
  //         './node_modules/circomlib/circuits',
  //         './node_modules/dmpierre/sha1-circom/circuits',
  //       ],
  //     }
  //   );
  // });

  // it('should compile and load the circuit', async function () {
  //   expect(circuit).to.not.be.undefined;
  // });
});
