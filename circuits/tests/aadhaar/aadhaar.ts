/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const circom_tester = require('circom_tester/wasm/tester')

import path from 'path'
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
import fs from 'fs'
import crypto from 'crypto'
import assert from 'assert'
import { buildPoseidon } from 'circomlibjs'
import { testQRData } from '../assets/dataInput.json'
import { bytesToIntChunks, padArrayWithZeros, bigIntsToString } from './util'
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config()

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
    path.join(__dirname, '../assets', getCertificate(testAadhaar)),
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
    nullifierSeed: 12345678,
    signalHash: 1001,
    revealGender: 0,
    revealAgeAbove18: 0,
    revealPinCode: 0,
    revealState: 0,
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

describe('AadhaarVerifier', function () {
  this.timeout(0)

  let circuit: any

  this.beforeAll(async () => {
    const pathToCircuit = path.join(
      __dirname,
      '../src',
      'aadhaar-verifier.circom',
    )
    circuit = await circom_tester(pathToCircuit, {
      recompile: true,
      // output: path.join(__dirname, '../build'),
      include: [
        path.join(__dirname, '../node_modules'),
        path.join(__dirname, '../../../node_modules'),
      ],
    })
  })

  it('should generate witness for circuit with Sha256RSA signature', async () => {
    const { inputs } = prepareTestData()

    await circuit.calculateWitness(inputs)
  })

  it('should output hash of pubkey', async () => {
    const { inputs, pubKey } = prepareTestData()

    const witness = await circuit.calculateWitness(inputs)

    // Calculate the Poseidon hash with pubkey chunked to 9*242 like in circuit
    const poseidon = await buildPoseidon()
    const pubkeyChunked = bigIntToChunkedBytes(pubKey, 242, 9)
    const hash = poseidon(pubkeyChunked)

    assert(witness[1] === BigInt(poseidon.F.toObject(hash)))
  })

  it('should compute nullifier correctly', async () => {
    const nullifierSeed = 12345678

    const { inputs, qrDataPadded, qrDataPaddedLen } = prepareTestData()
    inputs.nullifierSeed = nullifierSeed

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

    const first16 = poseidon([...photoBytesPacked.slice(0, 16)])
    const last16 = poseidon([...photoBytesPacked.slice(16, 32)])
    const nullifier = poseidon([nullifierSeed, first16, last16])

    assert(witness[2] == BigInt(poseidon.F.toString(nullifier)))
  })

  it('should output timestamp of when data is generated', async () => {
    const { inputs, decodedData } = prepareTestData()

    const witness = await circuit.calculateWitness(inputs)

    // This is the time in the QR data above is 20190308114407437.
    // 2019-03-08 11:44:07.437 rounded down to nearest hour is 2019-03-08 11:00:00.000
    // Converting this IST to UTC gives 2019-03-08T05:30:00.000Z
    const expectedTimestamp = timestampToUTCUnix(decodedData)

    assert(witness[3] === BigInt(expectedTimestamp))
  })

  it('should output extracted data if reveal is true', async () => {
    const { inputs } = prepareTestData()

    inputs.revealAgeAbove18 = 1
    inputs.revealGender = 1
    inputs.revealPinCode = 1
    inputs.revealState = 1

    const witness = await circuit.calculateWitness(inputs)

    // Age above 18
    assert(Number(witness[4]) === 1)

    // Gender
    assert(bigIntsToString([witness[5]]) === 'M')

    // Pin code
    assert(Number(witness[6]) === 110051)

    // State
    assert(bigIntsToString([witness[7]]) === 'Delhi')
  })

  it('should not output extracted data if reveal is false', async () => {
    const { inputs } = prepareTestData()

    inputs.revealAgeAbove18 = 0
    inputs.revealGender = 0
    inputs.revealPinCode = 0
    inputs.revealState = 0

    const witness = await circuit.calculateWitness(inputs)

    assert(Number(witness[4]) === 0)
    assert(Number(witness[5]) === 0)
    assert(Number(witness[6]) === 0)
    assert(Number(witness[7]) === 0)
  })
})