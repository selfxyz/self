import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect, assert } from "chai";
import { ethers } from "hardhat";
import { mockPassportData_sha256WithRSAEncryption_65537 } from "../../common/src/utils/mockPassportData";
import { countryCodes } from "../../common/src/constants/constants";
import { formatRoot, getCurrentDateYYMMDD } from "../../common/src/utils/utils";
import { groth16 } from 'snarkjs'
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import axios from 'axios';
import { revealBitmapFromMapping } from "../../common/src/utils/revealBitmap";
import { generateCircuitInputsRegister, generateCircuitInputs_Disclose } from "../../common/src/utils/generateInputs";
import fs from 'fs';
import { IMT } from "@zk-kit/imt";
import { poseidon2 } from "poseidon-lite";


describe("Proof of Passport - Contracts - Register & Disclose flow", function () {
    this.timeout(0);

    let passportData, proof, inputs: any, publicSignals, revealChars, pasrsedCallData: any[], formattedCallData: any;
    // Paths
    const path_register_wasm = "../circuits/build/register_sha256WithRSAEncryption_65537_js/register_sha256WithRSAEncryption_65537.wasm";
    const path_register_zkey = "../circuits/build/register_sha256WithRSAEncryption_65537_final.zkey";
    const path_register_vkey = "../circuits/build/register_sha256WithRSAEncryption_65537_vkey.json";

    const path_disclose_wasm = "../circuits/build/disclose_js/disclose.wasm";
    const path_disclose_zkey = "../circuits/build/disclose_final.zkey";
    const path_disclose_vkey = "../circuits/build/disclose_vkey.json";
    // Smart contracts
    let Verifier_register: any, verifier_register: any, Registry: any, registry: any, Formatter: any, formatter: any, Register: any, register: any, Verifier_disclose: any, verifier_disclose: any, SBT: any, sbt: any, PoseidonT3: any, poseidonT3: any;
    let owner, otherAccount, thirdAccount: any[];
    let imt: IMT;

    before(
        async function generateProof() {
            // Log the current block timestamp
            const latestBlock = await ethers.provider.getBlock('latest');
            // console.log(`Current block timestamp: ${latestBlock?.timestamp}`);

            // Set the next block timestamp to the current computer's timestamp
            const currentTimestamp = Math.floor(Date.now() / 1000) + 10;
            await ethers.provider.send('evm_setNextBlockTimestamp', [currentTimestamp]);
            await ethers.provider.send('evm_mine', []); // Mine a new block for the timestamp to take effect

            // Log the new block's timestamp to confirm
            const newBlock = await ethers.provider.getBlock('latest');
            // console.log(`New block timestamp set to: ${newBlock?.timestamp}`);

            passportData = mockPassportData_sha256WithRSAEncryption_65537;

            inputs = generateCircuitInputsRegister(
                BigInt(0).toString(), BigInt(0).toString(), passportData, { developmentMode: true }
            );

            /***  Groth16 saga  ***/
            // Generate the proof
            console.log('\x1b[32m%s\x1b[0m', 'Generating proof...');
            console.log(inputs);
            ({ proof, publicSignals } = await groth16.fullProve(
                inputs,
                path_register_wasm,
                path_register_zkey
            ))
            console.log('\x1b[32m%s\x1b[0m', 'Proof generated');
            // Verify the proof
            const vKey = JSON.parse(fs.readFileSync(path_register_vkey) as unknown as string);
            const verified = await groth16.verify(
                vKey,
                publicSignals,
                proof
            )
            assert(verified == true, 'Should verify')
            console.log('\x1b[32m%s\x1b[0m', 'Proof verified');

            const rawCallData = await groth16.exportSolidityCallData(proof, publicSignals);
            pasrsedCallData = JSON.parse(`[${rawCallData}]`);
            formattedCallData = {
                commitment: pasrsedCallData[3][0],
                nullifier: pasrsedCallData[3][1],
                merkle_root: pasrsedCallData[3][2],
                signature_algorithm: pasrsedCallData[3][3],
                a: pasrsedCallData[0],
                b: [pasrsedCallData[1][0], pasrsedCallData[1][1]],
                c: pasrsedCallData[2],
            };
            console.log('\x1b[34m%s\x1b[0m', 'formattedCallData:', formattedCallData);

            /*** Deploy contracts ***/

            [owner, otherAccount, thirdAccount] = await ethers.getSigners() as any[];

            Verifier_register = await ethers.getContractFactory("Verifier_register");
            verifier_register = await Verifier_register.deploy();
            await verifier_register.waitForDeployment();
            console.log('\x1b[34m%s\x1b[0m', `Verifier_register deployed to ${verifier_register.target}`);

            Formatter = await ethers.getContractFactory("Formatter");
            formatter = await Formatter.deploy();
            await formatter.waitForDeployment();
            await formatter.addCountryCodes(Object.entries(countryCodes));
            console.log('\x1b[34m%s\x1b[0m', `Formatter deployed to ${formatter.target}`);

            Registry = await ethers.getContractFactory("Registry");
            registry = await Registry.deploy(formatRoot(inputs.merkle_root));
            await registry.waitForDeployment();
            console.log('\x1b[34m%s\x1b[0m', `Registry deployed to ${registry.target}`);

            PoseidonT3 = await ethers.getContractFactory("PoseidonT3");
            poseidonT3 = await PoseidonT3.deploy();
            await poseidonT3.waitForDeployment();
            console.log('\x1b[34m%s\x1b[0m', `PoseidonT3 deployed to: ${poseidonT3.target}`);

            const poseidonT3Address = poseidonT3.target;
            Register = await ethers.getContractFactory("Register", {
                libraries: {
                    PoseidonT3: poseidonT3Address
                }
            });
            register = await Register.deploy(registry.target);
            await register.waitForDeployment();
            console.log('\x1b[34m%s\x1b[0m', `Register deployed to ${register.target}`);

            Verifier_disclose = await ethers.getContractFactory("Verifier_disclose");
            verifier_disclose = await Verifier_disclose.deploy();
            await verifier_disclose.waitForDeployment();
            console.log('\x1b[34m%s\x1b[0m', `Verifier_disclose deployed to ${verifier_disclose.target}`);

            SBT = await ethers.getContractFactory("SBT");
            sbt = await SBT.deploy(verifier_disclose.target, formatter.target, register.target);
            await sbt.waitForDeployment();
            console.log('\x1b[34m%s\x1b[0m', `SBT deployed to ${sbt.target}`);

            /*** Initialize merkle tree ***/
            imt = new IMT(poseidon2, 16, 0, 2);
        });

    describe("Proof of Passport - Register flow", function () {

        it("Verifier_register verifies a correct proof", async () => {
            expect(
                await verifier_register.verifyProof(pasrsedCallData[0], pasrsedCallData[1], pasrsedCallData[2], pasrsedCallData[3])
            ).to.be.true;
        });

        it("Register should succeed", async function () {

            const commitments = [1, 2, 3]; // Example array of commitments, all set to zero as per instructions
            for (const commitment of commitments) {
                await register.dev_add_commitment(commitment);
                imt.insert(BigInt(commitment));
            }
            //log merkle root
            console.log('\x1b[34m%s\x1b[0m', `Merkle root: ${await register.getMerkleRoot()}`);

            await register.dev_set_signature_algorithm(0, verifier_register.target);

            expect(await register
                .connect(thirdAccount) // fine that it's not the same account as address is taken from the proof
                .validateProof(formattedCallData)).not.to.be.reverted;

            // const indexOfCommitment = await register.indexOf(formattedCallData.commitment);
            // const merkleTreeSize = await register.getMerkleTreeSize();

        });

    });

    describe("Proof of Passport - Disclose flow", function () {
        it("SBT should succeed", async function () {

            /***  Groth16 saga  ***/
            // Generate the proof
            const input_disclose = generateCircuitInputs_Disclose(
                poseidon, inputs.secret, inputs.mrz, imt, [49, 50], thirdAccount
            );
            console.log('\x1b[32m%s\x1b[0m', 'Generating proof - SBT');
            console.log(input_disclose);
            ({ proof, publicSignals } = await groth16.fullProve(
                inputs,
                path_disclose_wasm,
                path_disclose_zkey
            ))
            console.log('\x1b[32m%s\x1b[0m', 'Proof generated - SBT');
            // Verify the proof
            const vKey = JSON.parse(fs.readFileSync(path_register_vkey) as unknown as string);
            const verified = await groth16.verify(
                vKey,
                publicSignals,
                proof
            )
            assert(verified == true, 'Should verify')
            console.log('\x1b[32m%s\x1b[0m', 'Proof verified');

            const rawCallData = await groth16.exportSolidityCallData(proof, publicSignals);
            pasrsedCallData = JSON.parse(`[${rawCallData}]`);
        });
    });

});

