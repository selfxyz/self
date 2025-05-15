// eslint-disable-next-line @typescript-eslint/no-var-requires
const circom_tester = require('circom_tester/wasm/tester')

import fs from 'fs'
import crypto from 'crypto'
import assert from 'assert'
import path from 'path'
import dotenv from 'dotenv'
import { sha256Pad } from '@zk-email/helpers/dist/sha-utils'
import {
  bigIntToChunkedBytes,
  bufferToHex,
  Uint8ArrayToCharArray,
} from '@zk-email/helpers/dist/binary-format'
import {
  convertBigIntToByteArray,
  decompressByteArray,
  splitToWords,
  extractPhoto,
  timestampToUTCUnix,
} from '@anon-aadhaar/core'
import { buildPoseidon } from 'circomlibjs'
import { testQRData } from '../../../common/tests/aadhaar/dataInput.json'
import { bytesToIntChunks, padArrayWithZeros, bigIntsToString } from '../aadhaar/utils'

dotenv.config();

// import { generateCircuitInputsRegister } from '../../../common/src/utils/circuits/generateInputs';

// import {
//   generateCommitment,
//   generateNullifier,
// } from '../../../common/src/utils/passports/passport';


// const testSuite = process.env.FULL_TEST_SUITE === 'true' ? fullSigAlgs : sigAlgs;
let testAadhaar = true
let QRData: string = testQRData
if (process.env.REAL_DATA === 'true') {
  testAadhaar = false
  if (typeof process.env.AADHAAR_QR_DATA === 'string') {
    QRData = process.env.AADHAAR_QR_DATA
  } else {
    throw Error('You must set .env var AADHAAR_QR_DATA when using real data.')
  }
}

const getCertificate = (_isTest: boolean) => {
  return _isTest ? 'testPublicKey.pem' : 'uidai_offline_publickey_26022021.cer'
}

function prepareTestData() {
  const qrDataBytes = convertBigIntToByteArray(BigInt(QRData))
  const decodedData = decompressByteArray(qrDataBytes)

  const signatureBytes = decodedData.slice(
    decodedData.length - 256,
    decodedData.length,
  )

  const signedData = decodedData.slice(0, decodedData.length - 256)

  const [qrDataPadded, qrDataPaddedLen] = sha256Pad(signedData, 512 * 3)

  const delimiterIndices: number[] = []
  for (let i = 0; i < qrDataPadded.length; i++) {
    if (qrDataPadded[i] === 255) {
      delimiterIndices.push(i)
    }
    if (delimiterIndices.length === 18) {
      break
    }
  }

  const signature = BigInt(
    '0x' + bufferToHex(Buffer.from(signatureBytes)).toString(),
  )

  const pkPem = fs.readFileSync(
    path.join(__dirname, '../../../common/aadhaar', getCertificate(testAadhaar)),
  )
  const pk = crypto.createPublicKey(pkPem)

  const pubKey = BigInt(
    '0x' +
      bufferToHex(
        Buffer.from(pk.export({ format: 'jwk' }).n as string, 'base64url'),
      ),
  )

  const inputs = {
    qrDataPadded: Uint8ArrayToCharArray(qrDataPadded),
    qrDataPaddedLength: qrDataPaddedLen,
    delimiterIndices: delimiterIndices,
    signature: splitToWords(signature, BigInt(121), BigInt(17)),
    pubKey: splitToWords(pubKey, BigInt(121), BigInt(17)),
    secret : 0
  }

  return {
    inputs,
    qrDataPadded,
    signedData,
    decodedData,
    pubKey,
    qrDataPaddedLen,
  }
}

describe('Register-Aadhaar',function () {
  this.timeout(0)

  let circuit: any

  this.beforeAll(async () => {
    circuit = await circom_tester(
        path.join(__dirname,'../../circuits/register/instances/register_aadhaar.circom'),
        {include:[
            'node_modules',
            './node_modules/@zk-kit/binary-merkle-root.circom/src',
            './node_modules/circomlib/circuits'
        ]}
    )
    
  })

  //passing
  // it('should generate witness for circuit with Sha256RSA signature', async () => {
  //   const { inputs } = prepareTestData()
  //   await circuit.calculateWitness(inputs)
  // })

  //passing
  // it('should output hash of pubkey', async () => {
  //   const { inputs, pubKey } = prepareTestData()

  //   const witness = await circuit.calculateWitness(inputs)

  //   // Calculate the Poseidon hash with pubkey chunked to 9*242 like in circuit
  //   const poseidon = await buildPoseidon()
  //   const pubkeyChunked = bigIntToChunkedBytes(pubKey, 242, 9)
  //   const hash = poseidon(pubkeyChunked)

  //   assert(witness[1] === BigInt(poseidon.F.toObject(hash)))
  // })

  // //passing
  // it('should output timestamp of when data is generated', async () => {
  //   const { inputs, decodedData } = prepareTestData()

  //   const witness = await circuit.calculateWitness(inputs)

  //   // This is the time in the QR data above is 20190308114407437.
  //   // 2019-03-08 11:44:07.437 rounded down to nearest hour is 2019-03-08 11:00:00.000
  //   // Converting this IST to UTC gives 2019-03-08T05:30:00.000Z
  //   const expectedTimestamp = timestampToUTCUnix(decodedData)

  //   assert(witness[2] === BigInt(expectedTimestamp))
  // })

  it('should compute nullifier correctly', async () => {

    const { inputs, qrDataPadded, qrDataPaddedLen } = prepareTestData()

    const witness = await circuit.calculateWitness(inputs)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const poseidon: any = await buildPoseidon()

    const { bytes: photoBytes } = extractPhoto(
      Array.from(qrDataPadded),
      qrDataPaddedLen,
    )
    const photoBytesPacked = padArrayWithZeros(
      bytesToIntChunks(new Uint8Array(photoBytes), 31),
      32,
    )

    const nullifier = poseidon([])

    assert(witness[2] == BigInt(poseidon.F.toString(nullifier)))
  })

  

  // it('Should compute commitment correctly', async () => {
  //   // 1. Prepare inputs & witness
  //   const { inputs, qrDataPadded } = prepareTestData();
  //   const witness = await circuit.calculateWitness(inputs);
  
  //   const poseidon = await buildPoseidon();
  //   const F = poseidon.F;
  
  //   // 3. Reproduce PackBytesAndPoseidon(maxDataLength) in JS

  
  //   // 4. Compute dataCommitment = Poseidon(dataBytesPacked)
  //   const dataHash = poseidon(dataBytesPacked);
  //   const dataCommitment = BigInt(F.toObject(dataHash));
  
  //   // 5. Compute expected commitment = Poseidon([ dataCommitment, secret ])
  //   const secretBig = BigInt(inputs.secret);
  //   const commitHash = poseidon([dataCommitment, secretBig]);
  //   const expectedCommitment = BigInt(F.toObject(commitHash));
  
  //   // 6. Grab the circuit’s output and compare
  //   const idx = circuit.getSignalIdx('main.commitment');
  //   const actualCommitment = witness[idx] as bigint;
  
  //   assert(
  //     actualCommitment === expectedCommitment,
  //     `commitment mismatch: circuit=${actualCommitment} js=${expectedCommitment}`
  //   );
  // });
  


})
