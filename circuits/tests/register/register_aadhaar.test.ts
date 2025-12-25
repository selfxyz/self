import { expect } from 'chai';
import { wasm as wasmTester } from 'circom_tester';
import path from 'path';
import { sha256Pad } from '@zk-email/helpers/dist/sha-utils.js';
import { bufferToHex, Uint8ArrayToCharArray } from '@zk-email/helpers/dist/binary-format.js';
import { convertBigIntToByteArray, decompressByteArray, splitToWords } from '@anon-aadhaar/core';
import assert from 'assert';
import { customHasher } from '@selfxyz/common/utils/hash';
import forge from 'node-forge';
import {
  prepareAadhaarRegisterTestData,
  generateTestData,
  testCustomData,
  prepareAadhaarRegisterData,
} from '@selfxyz/common';
import fs from 'fs';
import { pubkeys } from './pubkeys.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const privateKeyPem = fs.readFileSync(
  path.join(__dirname, '../../node_modules/anon-aadhaar-circuits/assets/testPrivateKey.pem'),
  'utf8'
);
const publicKeyPem = fs.readFileSync(
  path.join(__dirname, '../../node_modules/anon-aadhaar-circuits/assets/testPublicKey.pem'),
  'utf8'
);

describe('REGISTER AADHAAR Circuit Tests', function () {
  let circuit: any;
  this.beforeAll(async function () {
    this.timeout(0);
    circuit = await wasmTester(
      path.join(__dirname, '../../circuits/register/instances/register_aadhaar.circom'),
      {
        verbose: true,
        logOutput: true,
        include: ['node_modules', 'node_modules/circomlib/circuits'],
      }
    );
  });

  it('should compile and load the circuit', async function () {
    this.timeout(0);
    expect(circuit).to.not.be.undefined;
  });
  it('should pass constrain check for circuit with Sha256RSA signature', async function () {
    this.timeout(0);
    const { inputs } = prepareAadhaarRegisterTestData(privateKeyPem, publicKeyPem, '1234');
    const w = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(w);
  });
  it.skip('should pass constrain and output correct nullifier and commitment', async function () {
    this.timeout(0);
    const { inputs, nullifier, commitment } = prepareAadhaarRegisterTestData(
      privateKeyPem,
      publicKeyPem,
      '1234'
    );
    const w = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(w);

    const out = await circuit.getOutput(w, ['nullifier', 'commitment']);
    assert(BigInt(out.nullifier) === BigInt(nullifier));
    assert(BigInt(out.commitment) === BigInt(commitment));
  });

  it('should not verify the signature of created from different key', async function () {
    this.timeout(0);
    const { inputs } = prepareAadhaarRegisterTestData(privateKeyPem, publicKeyPem, '1234');
    const newTestData = generateTestData({ privKeyPem: privateKeyPem, data: testCustomData });
    const QRDataBytes = convertBigIntToByteArray(BigInt(newTestData.testQRData));
    const decodedData = decompressByteArray(QRDataBytes);

    const signatureBytes = decodedData.slice(decodedData.length - 256, decodedData.length);
    const newSignature = BigInt('0x' + bufferToHex(Buffer.from(signatureBytes)).toString());
    inputs.signature = splitToWords(newSignature, BigInt(121), BigInt(17));

    try {
      await circuit.calculateWitness(inputs);
      expect.fail('Expected circuit.calculateWitness to throw an error, but it succeeded');
    } catch (error) {
      expect(error).to.exist;
    }
  });

  it('should fail when qrdata is tampered', async function () {
    this.timeout(0);
    const { inputs } = prepareAadhaarRegisterTestData(privateKeyPem, publicKeyPem, '1234');

    const newTestData = generateTestData({
      privKeyPem: privateKeyPem,
      data: testCustomData,
      gender: 'F',
    });
    const QRDataBytes = convertBigIntToByteArray(BigInt(newTestData.testQRData));
    const decodedData = decompressByteArray(QRDataBytes);

    const signedData = decodedData.slice(0, decodedData.length - 256);

    const [qrDataPadded, qrDataPaddedLen] = sha256Pad(signedData, 512 * 3);

    inputs.qrDataPadded = Uint8ArrayToCharArray(qrDataPadded);
    inputs.qrDataPaddedLength = qrDataPaddedLen;

    try {
      await circuit.calculateWitness(inputs);
      expect.fail('Expected circuit.calculateWitness to throw an error, but it succeeded');
    } catch (error) {
      expect(error).to.exist;
    }
  });

  it('should return different commitment when secret is tampered', async function () {
    this.timeout(0);
    const { inputs, commitment } = prepareAadhaarRegisterTestData(
      privateKeyPem,
      publicKeyPem,
      '1234'
    );
    inputs.secret = '1235';
    const w = await circuit.calculateWitness(inputs);

    const out = await circuit.getOutput(w, ['commitment']);
    assert(BigInt(out.commitment) !== BigInt(commitment));
  });

  it.skip('should pass for different qr data', async function () {
    this.timeout(0);
    const { inputs, nullifier, commitment } = prepareAadhaarRegisterTestData(
      privateKeyPem,
      publicKeyPem,
      '1234',
      'KL RAHUL',
      '18-04-1992'
    );
    const w = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(w);

    const out = await circuit.getOutput(w, ['nullifier', 'commitment']);
    assert(BigInt(out.nullifier) === BigInt(nullifier));
    assert(BigInt(out.commitment) === BigInt(commitment));
  });

  it('should create the pubkey commitment correctly', async function () {
    this.timeout(0);
    const { inputs } = prepareAadhaarRegisterTestData(privateKeyPem, publicKeyPem, '1234');
    const w = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(w);

    const expectedPubKeyCommitment = customHasher(inputs.pubKey);

    const out = await circuit.getOutput(w, ['pubKeyHash']);
    assert(BigInt(out.pubKeyHash) === BigInt(expectedPubKeyCommitment));
  });

  it('should create the timestamp correctly', async function () {
    this.timeout(0);
    const { inputs } = prepareAadhaarRegisterTestData(
      privateKeyPem,
      publicKeyPem,
      '1234',
      'Some Guy',
      undefined,
      undefined,
      undefined,
      undefined,
      new Date(Date.now() - 30 * 60 * 1000).getTime().toString()
    );
    const w = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(w);

    const out = await circuit.getOutput(w, ['timestamp']);
  });

  it.skip('should work for a real id', async function () {
    this.timeout(0);
    const actualQrData = '';
    const { inputs, nullifier, commitment } = await prepareAadhaarRegisterData(
      actualQrData,
      '1234',
      pubkeys
    );
    const w = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(w);

    const out = await circuit.getOutput(w, ['nullifier', 'commitment', 'pubKeyHash']);
    assert(BigInt(out.nullifier) === BigInt(nullifier));
    assert(BigInt(out.commitment) === BigInt(commitment));
  });

  it.skip('should log all pubkey commitments', async function () {
    this.timeout(0);
    for (const cert of pubkeys) {
      const certObj = forge.pki.certificateFromPem(cert);
      const modulusHex = (certObj.publicKey as forge.pki.rsa.PublicKey).n.toString(16);
      const pubkey = BigInt('0x' + modulusHex);
      const pubkeyCommitment = customHasher(splitToWords(pubkey, BigInt(121), BigInt(17)));
      console.log(pubkeyCommitment);
    }
  });
});
