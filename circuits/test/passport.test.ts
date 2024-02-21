import { describe } from 'mocha'
import chai, { assert, expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { hash, toUnsignedByte, arraysAreEqual, bytesToBigDecimal, formatMrz, splitToWords } from '../../common/src/utils/utils'
import { groth16 } from 'snarkjs'
import { getPassportData } from '../../common/src/utils/passportData'
import { MAX_DATAHASHES_LEN, attributeToPosition } from '../../common/src/constants/constants'
import { sha256Pad } from '@zk-email/helpers'
import path from "path";
const fs = require('fs');
const wasm_tester = require("circom_tester").wasm;

chai.use(chaiAsPromised)

console.log("The following snarkjs error logs are normal and expected if the tests pass.")

describe('Circuit tests', function () {
  this.timeout(0)

  let inputs: any;

  this.beforeAll(async () => {
    const passportData = getPassportData();

    const formattedMrz = formatMrz(passportData.mrz);

    const concatenatedDataHashesHashDigest = hash(passportData.dataGroupHashes);
    console.log('concatenatedDataHashesHashDigest', concatenatedDataHashesHashDigest);

    assert(
      arraysAreEqual(passportData.eContent.slice(72, 72 + 32), concatenatedDataHashesHashDigest),
      'concatenatedDataHashesHashDigest is at the right place in passportData.eContent'
    )

    const reveal_bitmap = Array(88).fill('1');

    const [messagePadded, messagePaddedLen] = sha256Pad(
      new Uint8Array(passportData.dataGroupHashes),
      MAX_DATAHASHES_LEN
    );

    inputs = {
      mrz: formattedMrz.map(byte => String(byte)),
      reveal_bitmap: reveal_bitmap.map(byte => String(byte)),
      dataHashes: Array.from(messagePadded).map((x) => x.toString()),
      datahashes_padded_length: messagePaddedLen.toString(),
      eContentBytes: passportData.eContent.map(toUnsignedByte).map(byte => String(byte)),
      pubkey: splitToWords(
        BigInt(passportData.pubKey.modulus),
        BigInt(64),
        BigInt(32)
      ),
      signature: splitToWords(
        BigInt(bytesToBigDecimal(passportData.encryptedDigest)),
        BigInt(64),
        BigInt(32)
      ),
      address: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8", // sample address
    }

    console.log('inputs', inputs);
  })
  
  describe('Proof', function() {
    it('should prove and verify with valid inputs', async function () {
      const { proof, publicSignals } = await groth16.fullProve(
        inputs,
        "build/proof_of_passport_js/proof_of_passport.wasm",
        "build/proof_of_passport_final.zkey"
      )

      const vKey = JSON.parse(fs.readFileSync("build/verification_key.json"));
      const verified = await groth16.verify(
        vKey,
        publicSignals,
        proof
      )

      assert(verified == true, 'Should verifiable')
    })

    it('should fail to prove with invalid mrz', async function () {
      const invalidInputs = {
        ...inputs,
        mrz: inputs.mrz.map((byte: string) => String((parseInt(byte, 10) + 1) % 256)),
      }

      return expect(groth16.fullProve(
        invalidInputs,
        "build/proof_of_passport_js/proof_of_passport.wasm",
        "build/proof_of_passport_final.zkey"
      )).to.be.rejected;
    })

    it('should fail to prove with invalid eContentBytes', async function () {
      const invalidInputs = {
        ...inputs,
        eContentBytes: inputs.eContentBytes.map((byte: string) => String((parseInt(byte, 10) + 1) % 256)),
      }

      return expect(groth16.fullProve(
        invalidInputs,
        "build/proof_of_passport_js/proof_of_passport.wasm",
        "build/proof_of_passport_final.zkey"
      )).to.be.rejected;
    })
    
    it('should fail to prove with invalid signature', async function () {
      const invalidInputs = {
        ...inputs,
        signature: inputs.signature.map((byte: string) => String((parseInt(byte, 10) + 1) % 256)),
      }

      return expect(groth16.fullProve(
        invalidInputs,
        "build/proof_of_passport_js/proof_of_passport.wasm",
        "build/proof_of_passport_final.zkey"
      )).to.be.rejected;
    })

    it("shouldn't allow address maleability", async function () {
      const { proof, publicSignals } = await groth16.fullProve(
        inputs,
        "build/proof_of_passport_js/proof_of_passport.wasm",
        "build/proof_of_passport_final.zkey"
      )

      publicSignals[publicSignals.length - 1] = BigInt("0xC5B4F2A7Ea7F675Fca6EF724d6E06FFB40dFC93F").toString();

      const vKey = JSON.parse(fs.readFileSync("build/verification_key.json"));
      return expect(await groth16.verify(
        vKey,
        publicSignals,
        proof
      )).to.be.false;
    })
  })

  describe('Selective disclosure', function() {
    const attributeCombinations = [
      ['issuing_state', 'name'],
      ['passport_number', 'nationality', 'date_of_birth'],
      ['gender', 'expiry_date'],
    ];

    attributeCombinations.forEach(combination => {
      it(`Disclosing ${combination.join(", ")}`, async function () {
        const attributeToReveal = Object.keys(attributeToPosition).reduce((acc, attribute) => {
          acc[attribute] = combination.includes(attribute);
          return acc;
        }, {});
  
        const bitmap = Array(88).fill('0');

        Object.entries(attributeToReveal).forEach(([attribute, reveal]) => {
          if (reveal) {
            const [start, end] = attributeToPosition[attribute];
            bitmap.fill('1', start, end + 1);
          }
        });
  
        inputs = {
          ...inputs,
          reveal_bitmap: bitmap.map(String),
        }
  
        const { proof, publicSignals } = await groth16.fullProve(
          inputs,
          "build/proof_of_passport_js/proof_of_passport.wasm",
          "build/proof_of_passport_final.zkey"
        )
  
        console.log('proof done');
  
        const vKey = JSON.parse(fs.readFileSync("build/verification_key.json"));
        const verified = await groth16.verify(
          vKey,
          publicSignals,
          proof
        )
  
        assert(verified == true, 'Should verifiable')
  
        console.log('proof verified');
  
        const firstThreeElements = publicSignals.slice(0, 3);
        const bytesCount = [31, 31, 26]; // nb of bytes in each of the first three field elements
  
        const bytesArray = firstThreeElements.flatMap((element: string, index: number) => {
          const bytes = bytesCount[index];
          const elementBigInt = BigInt(element);
          const byteMask = BigInt(255); // 0xFF
        
          const bytesOfElement = [...Array(bytes)].map((_, byteIndex) => {
            return (elementBigInt >> (BigInt(byteIndex) * BigInt(8))) & byteMask;
          });
        
          return bytesOfElement;
        });
        
        const result = bytesArray.map((byte: bigint) => String.fromCharCode(Number(byte)));
  
        console.log(result);
  
        for(let i = 0; i < result.length; i++) {
          if (bitmap[i] == '1') {
            const char = String.fromCharCode(Number(inputs.mrz[i + 5]));
            assert(result[i] == char, 'Should reveal the right one');
          } else {
            assert(result[i] == '\x00', 'Should not reveal');
          }
        }
      });
    });


  })

  // use these tests with .only to check changes without rebuilding the zkey
  describe('Circom tester tests', function() {
    it('should prove and verify with valid inputs', async function () {
      const circuit = await wasm_tester(
        path.join(__dirname, `../circuits/proof_of_passport.circom`),
        { include: ["node_modules"] },
      );
      const w = await circuit.calculateWitness(inputs);
      await circuit.checkConstraints(w);
    })
  })

})


