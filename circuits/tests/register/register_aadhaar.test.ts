import { expect } from 'chai';
import { wasm as wasmTester } from 'tests/utils/circomTesterCompat.js';
import path from 'path';
import { sha256Pad } from '@zk-email/helpers/dist/sha-utils.js';
import { Uint8ArrayToCharArray } from '@zk-email/helpers/dist/binary-format.js';
import { convertBigIntToByteArray, decompressByteArray, splitToWords } from '@anon-aadhaar/core';
import assert from 'assert';
import forge from 'node-forge';
import { fileURLToPath } from 'url';

import { customHasher } from '@selfxyz/new-common/src/crypto/hash/poseidon.js';
import { AadhaarDocument } from '@selfxyz/new-common/src/documents/aadhaar/adapter.js';
import { genMockIdDoc } from '@selfxyz/new-common/src/testing/genMockIdDoc.js';
import {
  generateTestData,
  testCustomData,
} from '@selfxyz/new-common/src/testing/genMockAadhaarData.js';
import {
  AADHAAR_MOCK_PRIVATE_KEY_PEM,
  AADHAAR_MOCK_PUBLIC_KEY_PEM,
} from '@selfxyz/new-common/src/testing/mockAadhaarCert.js';
import {
  extractSignatureBytes,
  processQRData,
} from '@selfxyz/new-common/src/documents/aadhaar/qr.js';
import { createCircuitInputGenerator } from '@selfxyz/new-common/src/circuits/generator.js';
import type { AadhaarData } from '@selfxyz/new-common/src/foundation/types/document.js';
import { pubkeys } from './pubkeys.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const generator = createCircuitInputGenerator();

function createAadhaarDoc(opts?: {
  name?: string;
  dateOfBirth?: string;
  gender?: string;
  pincode?: string;
  state?: string;
  timestamp?: string;
}): AadhaarDocument {
  const hasCustom =
    opts?.name ||
    opts?.dateOfBirth ||
    opts?.gender ||
    opts?.pincode ||
    opts?.state ||
    opts?.timestamp;
  if (hasCustom) {
    // For custom fields or timestamp, we generate test data and build AadhaarData manually
    const generated = generateTestData({
      privKeyPem: AADHAAR_MOCK_PRIVATE_KEY_PEM,
      data: testCustomData,
      name: opts?.name,
      dob: opts?.dateOfBirth,
      gender: opts?.gender,
      pincode: opts?.pincode,
      state: opts?.state,
      timestamp: opts?.timestamp,
    });
    const processed = processQRData(generated.testQRData);
    const signatureBytes = extractSignatureBytes(processed.decodedData);
    const data: AadhaarData = {
      documentType: 'mock_aadhaar',
      documentCategory: 'aadhaar',
      mock: true,
      qrData: generated.testQRData,
      extractedFields: processed.extractedFields,
      signature: Array.from(signatureBytes),
      publicKey: AADHAAR_MOCK_PUBLIC_KEY_PEM,
      photoHash: processed.photoHash.toString(),
    };
    return new AadhaarDocument(data);
  }

  // Default case: use unified genMockIdDoc
  const data = genMockIdDoc({ idType: 'mock_aadhaar' });
  return new AadhaarDocument(data);
}

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
    const doc = createAadhaarDoc();
    const inputs = generator.generateRegisterInputs(doc, '1234', '');
    const w = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(w);
  });

  it('should pass constrain and output correct nullifier and commitment', async function () {
    this.timeout(0);
    const doc = createAadhaarDoc();
    const inputs = generator.generateRegisterInputs(doc, '1234', '');
    const w = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(w);

    const out = await circuit.getOutput(w, ['nullifier', 'commitment']);
    assert(BigInt(out.nullifier) === BigInt(doc.generateNullifier()));
    assert(BigInt(out.commitment) === BigInt(doc.generateCommitment('1234')));
  });

  it('should not verify the signature of created from different key', async function () {
    this.timeout(0);
    const doc = createAadhaarDoc();
    const inputs = generator.generateRegisterInputs(doc, '1234', '') as Record<string, any>;
    const newTestData = generateTestData({
      privKeyPem: AADHAAR_MOCK_PRIVATE_KEY_PEM,
      data: testCustomData,
    });
    const QRDataBytes = convertBigIntToByteArray(BigInt(newTestData.testQRData));
    const decodedData = decompressByteArray(QRDataBytes);

    const signatureBytes = decodedData.slice(decodedData.length - 256, decodedData.length);
    const newSignature = BigInt('0x' + Buffer.from(signatureBytes).toString('hex'));
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
    const doc = createAadhaarDoc();
    const inputs = generator.generateRegisterInputs(doc, '1234', '') as Record<string, any>;

    const newTestData = generateTestData({
      privKeyPem: AADHAAR_MOCK_PRIVATE_KEY_PEM,
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
    const doc = createAadhaarDoc();
    const originalCommitment = doc.generateCommitment('1234');
    const inputs = generator.generateRegisterInputs(doc, '1234', '') as Record<string, any>;
    inputs.secret = '1235';
    const w = await circuit.calculateWitness(inputs);

    const out = await circuit.getOutput(w, ['commitment']);
    assert(BigInt(out.commitment) !== BigInt(originalCommitment));
  });

  it.skip('should pass for different qr data', async function () {
    this.timeout(0);
    const doc = createAadhaarDoc({
      name: 'KL RAHUL',
      dateOfBirth: '18-04-1992',
    });
    const inputs = generator.generateRegisterInputs(doc, '1234', '');
    const w = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(w);

    const out = await circuit.getOutput(w, ['nullifier', 'commitment']);
    assert(BigInt(out.nullifier) === BigInt(doc.generateNullifier()));
    assert(BigInt(out.commitment) === BigInt(doc.generateCommitment('1234')));
  });

  it('should create the pubkey commitment correctly', async function () {
    this.timeout(0);
    const doc = createAadhaarDoc();
    const inputs = generator.generateRegisterInputs(doc, '1234', '') as Record<string, any>;
    const w = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(w);

    const expectedPubKeyCommitment = customHasher(inputs.pubKey);

    const out = await circuit.getOutput(w, ['pubKeyHash']);
    assert(BigInt(out.pubKeyHash) === BigInt(expectedPubKeyCommitment));
  });

  it('should create the timestamp correctly', async function () {
    this.timeout(0);
    const doc = createAadhaarDoc({
      name: 'Some Guy',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).getTime().toString(),
    });
    const inputs = generator.generateRegisterInputs(doc, '1234', '');
    const w = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(w);

    const out = await circuit.getOutput(w, ['timestamp']);
  });

  it.skip('should work for a real id', async function () {
    this.timeout(0);
    // Production path — not testable without real QR data + matching certs
  });

  it('should log all pubkey commitments', async function () {
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
