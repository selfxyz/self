// Import necessary libraries
import chai, { assert, expect } from 'chai'
import path from "path";
import { getPassportData } from "../../common/src/utils/passportData";
import { hash, toUnsignedByte, arraysAreEqual, bytesToBigDecimal, formatMrz, splitToWords } from '../../common/src/utils/utils'
import { MAX_DATAHASHES_LEN, attributeToPosition } from '../../common/src/constants/constants'
import { getCurrentDateYYMMDD } from '../../common/src/utils/utils';
import { sha256Pad } from '@zk-email/helpers'; // Ensure this import is added
const wasm_tester = require("circom_tester").wasm;

describe.only("start testing of proof_of_passport_majority.circom", function () {
    this.timeout(0);
    let inputs: any;
    let circuit: any;
    let w: any;
    let current_date: any;
    let majority: any = [49, 56];

    before(async () => {

        circuit = await wasm_tester(path.join(__dirname, "../circuits/proof_of_passport.circom"),
            { include: ["node_modules"] },
        );
        const passportData = getPassportData();

        const formattedMrz = formatMrz(passportData.mrz);

        const concatenatedDataHashesHashDigest = hash(passportData.dataGroupHashes);
        assert(
            arraysAreEqual(passportData.eContent.slice(72, 72 + 33), concatenatedDataHashesHashDigest),
            'concatenatedDataHashesHashDigest is at the right place in passportData.eContent'
        )

        const reveal_bitmap = Array(90).fill('1');
        const [messagePadded, messagePaddedLen] = sha256Pad(
            new Uint8Array(passportData.dataGroupHashes),
            MAX_DATAHASHES_LEN
        );

        current_date = getCurrentDateYYMMDD();
        inputs = {
            mrz: formattedMrz.map(byte => String(byte)),
            reveal_bitmap: reveal_bitmap.map(byte => String(byte)),
            dataHashes: Array.from(messagePadded).map((x) => x.toString()), // Use the padded data hashes
            datahashes_padded_length: messagePaddedLen.toString(), // Include the padded length if needed
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
            current_date: current_date,
            majority: majority.map(byte => String(byte))
        }
        w = await circuit.calculateWitness(inputs);

    });

    it("compile and load the circuit", async function () {
        expect(circuit).to.not.be.undefined;
    });

    it("check contraints", async function () {
        await circuit.checkConstraints(w);
    });

    it("verify reveal_packed outputs for major", async function () {
        const outputs = await circuit.getOutput(w, ["reveal_packed[3]"]);
        const unpackedReveals = unpackRevealPacked(outputs);
        const expectedReveals = generateExpectedReveals(inputs, majority);
        expect(unpackedReveals).to.deep.equal(expectedReveals, "Circuit output does not match expected output");
    });
});

function unpackRevealPacked(packed) {
    let unpacked = [];
    const bytesCount = [31, 31, 28];

    Object.keys(packed).forEach((key, index) => {
        let element = BigInt(packed[key]);
        for (let j = 0; j < bytesCount[index]; j++) {
            const byte = Number(element & BigInt(0xFF));
            unpacked.push(byte);
            element = element >> BigInt(8);
        }
    });

    return unpacked;
}

function generateExpectedReveals(inputs, user_majority) {
    let expectedReveals = [];
    //Keep the last bytes for majority check
    for (let i = 0; i < inputs.reveal_bitmap.length - user_majority.length; i++) {
        expectedReveals.push(inputs.reveal_bitmap[i] === '1' ? parseInt(inputs.mrz[i + 5]) : 0);
    }
    expectedReveals.push(user_majority[0]) * inputs.reveal_bitmap[88];
    expectedReveals.push(user_majority[1]) * inputs.reveal_bitmap[89];
    return expectedReveals;
}