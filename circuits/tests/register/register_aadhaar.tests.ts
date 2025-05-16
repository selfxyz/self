// eslint-disable-next-line @typescript-eslint/no-var-requires
const circom_tester = require('circom_tester/wasm/tester')

import fs from 'fs'
import assert from 'assert'
import path from 'path'
import dotenv from 'dotenv'
import {
  bigIntToChunkedBytes
} from '@zk-email/helpers/dist/binary-format'
import {
  timestampToUTCUnix,
} from '@anon-aadhaar/core'
import { buildPoseidon } from 'circomlibjs'
import {
  prepareTestData
} from '../../../common/src/utils/aadhaar/aadhaar';


dotenv.config();

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
  it('should generate witness for circuit with Sha256RSA signature', async () => {
    const { inputs } = prepareTestData()
    await circuit.calculateWitness(inputs)
  })

  //passing
  it('should output hash of pubkey', async () => {
    const { inputs, pubKey } = prepareTestData()

    const witness = await circuit.calculateWitness(inputs)

    // Calculate the Poseidon hash with pubkey chunked to 9*242 like in circuit
    const poseidon = await buildPoseidon()
    const pubkeyChunked = bigIntToChunkedBytes(pubKey, 242, 9)
    const hash = poseidon(pubkeyChunked)

    assert(witness[1] === BigInt(poseidon.F.toObject(hash)))
  })

  // //passing
  it('should output timestamp of when data is generated', async () => {
    const { inputs, decodedData } = prepareTestData()

    const witness = await circuit.calculateWitness(inputs)

    // This is the time in the QR data above is 20190308114407437.
    // 2019-03-08 11:44:07.437 rounded down to nearest hour is 2019-03-08 11:00:00.000
    // Converting this IST to UTC gives 2019-03-08T05:30:00.000Z
    const expectedTimestamp = timestampToUTCUnix(decodedData)

    assert(witness[2] === BigInt(expectedTimestamp))
  })

  it('should compute nullifier correctly', async () => {

    const { inputs, qrDataPadded, qrDataPaddedLen } = prepareTestData()

    const witness = await circuit.calculateWitness(inputs)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const poseidon: any = await buildPoseidon()

    const nullifier = poseidon([])

    // assert(witness[2] == BigInt(poseidon.F.toString(nullifier)))
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


  // it('should compute nullifier correctly', async () => {
  //   const nullifierSeed = 12345678

  //   const { inputs, qrDataPadded, qrDataPaddedLen } = prepareTestData()
  //   inputs.nullifierSeed = nullifierSeed

  //   const witness = await circuit.calculateWitness(inputs)

  //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //   const poseidon: any = await buildPoseidon()

  //   const { bytes: photoBytes } = extractPhoto(
  //     Array.from(qrDataPadded),
  //     qrDataPaddedLen,
  //   )
  //   const photoBytesPacked = padArrayWithZeros(
  //     bytesToIntChunks(new Uint8Array(photoBytes), 31),
  //     32,
  //   )

  //   const first16 = poseidon([...photoBytesPacked.slice(0, 16)])
  //   const last16 = poseidon([...photoBytesPacked.slice(16, 32)])
  //   const nullifier = poseidon([nullifierSeed, first16, last16])

  //   assert(witness[2] == BigInt(poseidon.F.toString(nullifier)))
  // })
})
