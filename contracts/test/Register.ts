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
import { generateCircuitInputs_Register } from "../../common/src/utils/generateInputs";
import fs from 'fs';


describe("Register", function () {
    this.timeout(0);

    let passportData, proof, inputs: any, publicSignals, revealChars, callData: any[], formattedCallData: any;

    before(async function generateProof() {
        // // Log the current block timestamp
        // const latestBlock = await ethers.provider.getBlock('latest');
        // // console.log(`Current block timestamp: ${latestBlock?.timestamp}`);

        // // Set the next block timestamp to the current computer's timestamp
        // const currentTimestamp = Math.floor(Date.now() / 1000) + 10;
        // await ethers.provider.send('evm_setNextBlockTimestamp', [currentTimestamp]);
        // await ethers.provider.send('evm_mine', []); // Mine a new block for the timestamp to take effect

        // // Log the new block's timestamp to confirm
        // const newBlock = await ethers.provider.getBlock('latest');
        // // console.log(`New block timestamp set to: ${newBlock?.timestamp}`);

        passportData = mockPassportData_sha256WithRSAEncryption_65537;

        inputs = generateCircuitInputs_Register(
            passportData,
            { developmentMode: true }
        );


        console.log('generating proof...');
        ({ proof, publicSignals } = await groth16.fullProve(
            inputs,
            "../circuits/build/register_sha256WithRSAEncryption65537_js/register_sha256WithRSAEncryption65537.wasm",
            "../circuits/build/register_sha256WithRSAEncryption65537_final.zkey"
        ))

        console.log('proof done');
        revealChars = publicSignals.slice(0, 89).map((byte: string) => String.fromCharCode(parseInt(byte, 10))).join('');

        const vKey = JSON.parse(fs.readFileSync("../circuits/build/register_sha256WithRSAEncryption65537_vkey.json") as unknown as string);
        const verified = await groth16.verify(
            vKey,
            publicSignals,
            proof
        )

        assert(verified == true, 'Should verify')

        const cd = await groth16.exportSolidityCallData(proof, publicSignals);
        callData = JSON.parse(`[${cd}]`);
        formattedCallData = {
            commitment: callData[3][0],
            nullifier: callData[3][1],
            signature_algorithm: callData[3][2],
            merkle_root: callData[3][3],
            a: callData[0],
            b: [callData[1][0], callData[1][1]],
            c: callData[2],
        };
        console.log('callData', callData);
        console.log('Formatted callData for RegisterProof:', formattedCallData);




    });

    describe("PoP Register", function () {
        async function deployHardhatFixture() {
            const [owner, otherAccount, thirdAccount] = await ethers.getSigners();

            const Verifier = await ethers.getContractFactory("Groth16Verifier");
            const verifier = await Verifier.deploy();
            await verifier.waitForDeployment();

            console.log(`Verifier deployed to ${verifier.target}`);

            const Formatter = await ethers.getContractFactory("Formatter");
            const formatter = await Formatter.deploy();
            await formatter.waitForDeployment();
            await formatter.addCountryCodes(Object.entries(countryCodes));

            console.log(`Formatter deployed to ${formatter.target}`);

            const Registry = await ethers.getContractFactory("Registry");
            const registry = await Registry.deploy(formatRoot(inputs.merkle_root));
            await registry.waitForDeployment();

            console.log(`Registry deployed to ${registry.target}`);

            const PoseidonT3 = await ethers.getContractFactory("PoseidonT3");
            const poseidonT3 = await PoseidonT3.deploy();
            await poseidonT3.waitForDeployment();

            console.log("PoseidonT3 deployed to:", poseidonT3.target);
            const poseidonT3Address = poseidonT3.target;
            const Register = await ethers.getContractFactory("Register", {
                libraries: {
                    PoseidonT3: poseidonT3Address
                }
            });
            const register = await Register.deploy(formatter.target, registry.target);
            await register.waitForDeployment();

            console.log(`Register deployed to ${register.target}`);

            return { verifier, register, registry, formatter, owner, otherAccount, thirdAccount }

            //registry.target
        }

        it("Verifier verifies a correct proof", async () => {
            const { verifier } = await loadFixture(deployHardhatFixture);
            expect(
                await verifier.verifyProof(callData[0], callData[1], callData[2], callData[3])
            ).to.be.true;
        });

        it("Register should succeed", async function () {
            const { verifier, register, registry, otherAccount, thirdAccount } = await loadFixture(
                deployHardhatFixture
            );

            const commitments = [1, 2, 3, 4, 5]; // Example array of commitments, all set to zero as per instructions
            for (const commitment of commitments) {
                await register.dev_add_commitment(commitment);
            }

            await register.dev_set_signature_algorithm(1, verifier.target);

            expect(await register
                .connect(thirdAccount) // fine that it's not the same account as address is taken from the proof
                .validateProof(formattedCallData)).not.to.be.reverted;
            const indexOfCommitment = await register.indexOf(formattedCallData.commitment);
            console.log(`Index of commitment: ${indexOfCommitment}`);
            const merkleTreeSize = await register.getMerkleTreeSize();
            console.log(`Merkle tree size: ${merkleTreeSize}`);
        });

        // it("Shouldn't allow minting with an invalid proof", async function () {
        //     const { register, otherAccount } = await loadFixture(
        //         deployHardhatFixture
        //     );

        //     const badCallData = JSON.parse(JSON.stringify(callData));

        //     badCallData[0][1] = "0x1cdbaf59a0439d55f19162ee0be5a501f5b55c669a6e1f8d27b75d95ff31ff7b";

        //     expect(
        //         register
        //             .connect(otherAccount)
        //             .mint(...badCallData as any)
        //     ).to.be.revertedWith("Invalid proof");
        // });

        // it("Should have a valid tokenURI", async function () {
        //     const { register, otherAccount } = await loadFixture(
        //         deployHardhatFixture
        //     );

        //     console.log('callData', callData)

        //     const tx = await register
        //         .connect(otherAccount)
        //         .mint(...callData);

        //     await tx.wait();

        //     const tokenURI = await register.tokenURI(0);

        //     console.log('tokenURI', tokenURI);

        //     const decodedTokenURI = Buffer.from(tokenURI.split(',')[1], 'base64').toString();
        //     let parsedTokenURI;

        //     try {
        //         parsedTokenURI = JSON.parse(decodedTokenURI);
        //     } catch (e) {
        //         assert(false, 'TokenURI is not a valid JSON');
        //     }
        //     console.log('parsedTokenURI', parsedTokenURI);
        // });

        // it("Should convert ISO dates to unix timestamps correctly", async function () {
        //     const { formatter } = await loadFixture(
        //         deployHardhatFixture
        //     );

        //     const unix_timestamp = await formatter.dateToUnixTimestamp("230512") // 2023 05 12
        //     console.log('unix_timestamp', unix_timestamp.toString());

        //     var date = new Date(Number(unix_timestamp) * 1000);
        //     console.log("date:", date.toUTCString());

        //     expect(date.getUTCFullYear()).to.equal(2023);
        //     expect(date.getUTCMonth()).to.equal(4);
        //     expect(date.getUTCDate()).to.equal(12);
        // })

        // it("Should support expiry", async function () {
        //     const { register, otherAccount } = await loadFixture(
        //         deployHardhatFixture
        //     );

        //     const tx = await register
        //         .connect(otherAccount)
        //         .mint(...callData);

        //     await tx.wait();

        //     const tokenURI = await register.tokenURI(0);
        //     const decodedTokenURI = Buffer.from(tokenURI.split(',')[1], 'base64').toString();
        //     const parsedTokenURI = JSON.parse(decodedTokenURI);

        //     const expired = parsedTokenURI.attributes.find((attribute: any) => attribute.trait_type === 'Expired');
        //     expect(expired.value).to.equal('No');

        //     await time.increaseTo(2240161656); // 2040

        //     const tokenURIAfter = await register.tokenURI(0);
        //     const decodedTokenURIAfter = Buffer.from(tokenURIAfter.split(',')[1], 'base64').toString();
        //     const parsedTokenURIAfter = JSON.parse(decodedTokenURIAfter);

        //     const expiredAfter = parsedTokenURIAfter.attributes.find((attribute: any) => attribute.trait_type === 'Expired');

        //     expect(expiredAfter.value).to.equal('Yes');
        // })

        // it("Should revert minting if the current date is set in the past", async function () {
        //     const { register, otherAccount } = await loadFixture(deployHardhatFixture);

        //     // Adjust inputs to set a current date 3 days in the past
        //     const pastDateYYMMDD = getCurrentDateYYMMDD(-3);

        //     inputs = { ...inputs, current_date: pastDateYYMMDD.map(datePart => BigInt(datePart).toString()) };

        //     console.log('pastDateYYMMDD', pastDateYYMMDD);
        //     console.log('inputs', inputs);

        //     // Generate proof with modified inputs
        //     console.log('generating proof with past date...');
        //     const { proof: invalidProof, publicSignals: invalidPublicSignals } = await groth16.fullProve(
        //         inputs,
        //         "../circuits/build/register_sha256WithRSAEncryption65537_js/register_sha256WithRSAEncryption65537.wasm",
        //         "../circuits/build/register_sha256WithRSAEncryption65537_final.zkey"
        //     );

        //     const invalidCd = await groth16.exportSolidityCallData(invalidProof, invalidPublicSignals);
        //     const invalidCallData = JSON.parse(`[${invalidCd}]`);

        //     // Attempt to mint with the proof generated with a past date
        //     await expect(
        //         register
        //             .connect(otherAccount)
        //             .mint(...invalidCallData)
        //     ).to.be.revertedWith("Current date is not within the valid range");
        // });
    });

    // describe("Minting on mumbai", function () {
    //     it.skip("Should allow minting using a proof generated by ark-circom", async function () {
    //         const newCallDataFromArkCircom = [["0x089e5850e432d76f949cedc26527a7fb093194dd4026d5efb07c8ce6093fa977", "0x0154b01b5698e6249638be776d3641392cf89a5ad687beb2932c0ccf33f271d4"], [["0x2692dbce207361b048e6eff874fdc5d50433baa546fa754348a87373710044c0", "0x1db8ddab0dc204d41728efc05d2dae690bebb782b6088d92dda23a87b6bed0a2"], ["0x106be642690f0fe3562d139ed09498d979c8b35ecfb04e5a49422015cafa2705", "0x0b133e53cd0b4944ce2d34652488a16d1a020905dc1972ccc883d364dd3bb4ee"]], ["0x09eda5d551b150364ecb3efb432e4568b2be8f83c2db1dd1e1285c45a428b32b", "0x008ee9e870e5416849b3c94b8b9e4759580659f5a6535652d0a6634df23db2f5"], ["0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x000000000000000000000000000000006df9dd0914f215fafa1513e51ac9f1e2", "0x00000000000000000000000000000000000000000000093e703cd030e286890e", "0x0000000000000000000000000000000000000000000004770a914f3ae4e1288b", "0x000000000000000000000000000000000000000000000bf7e8ecb4e9609a489d", "0x00000000000000000000000000000000000000000000035762de41038bc2dcf1", "0x00000000000000000000000000000000000000000000050442c4055d62e9c4af", "0x0000000000000000000000000000000000000000000004db2bdc79a477a0fce0", "0x000000000000000000000000000000000000000000000acdbf649c76ec3df9ad", "0x000000000000000000000000000000000000000000000aaa0e6798ee3694f5ca", "0x000000000000000000000000000000000000000000000a1eaac37f80dd5e2879", "0x00000000000000000000000000000000000000000000033e063fba83c27efbce", "0x00000000000000000000000000000000000000000000045b9b05cab95025b000", "0x000000000000000000000000e6e4b6a802f2e0aee5676f6010e0af5c9cdd0a50"]];
    //         // const callDataFromArkCircomGeneratedInTest = [ [ '0x07a378ec2b5bafc15a21fb9c549ba2554a4ef22cfca3d835f44d270f547d0913', '0x089bb81fb68200ef64652ada5edf71a98dcc8a931a54162b03b61647acbae1fe' ], [ [ '0x2127ae75494aed0c384567cc890639d7609040373d0a549e665a26a39b264449', '0x2f0ea6c99648171b7e166086108131c9402f9c5ac4a3759705a9c9217852e328' ], [ '0x04efcb825be258573ffe8c9149dd2b040ea3b8a9fa3dfa1c57a87b11c20c21ec', '0x2b500aece0e5a5a64a5c7262ec379efc1a23f4e46d968aebd42337642ea2bd3e' ] ], [ '0x1964dc2231bcd1e0de363c3d2a790346b7e634b5878498ce6e8db0ac972b8125', '0x0d94cd74a89b0ed777bb309ce960191acd23d5e9c5f418722d03f80944c5e3ed' ], [ '0x000000000000000000544e45524f4c4600000000000000000000000000000000', '0x0000000000000000000000000000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000000000000000000000000000', '0x000000000000000000000000000000000df267467de87516584863641a75504b', '0x00000000000000000000000000000000000000000000084c754a8650038f4c82', '0x000000000000000000000000000000000000000000000d38447935bb72a5193c', '0x000000000000000000000000000000000000000000000cac133b01f78ab24970', '0x0000000000000000000000000000000000000000000006064295cda88310ce6e', '0x000000000000000000000000000000000000000000001026cd8776cbd52df4b0', '0x000000000000000000000000000000000000000000000d4748d254334ce92b36', '0x0000000000000000000000000000000000000000000005c1b0ba7159834b0bf1', '0x00000000000000000000000000000000000000000000029d91f03395b916792a', '0x000000000000000000000000000000000000000000000bcfbb30f8ea70a224df', '0x00000000000000000000000000000000000000000000003dcd943c93e565aa3e', '0x0000000000000000000000000000000000000000000009e8ce7916ab0fb0b000', '0x000000000000000000000000ede0fa5a7b196f512204f286666e5ec03e1005d2' ] ];

    //         const registerOnMumbaiAddress = '0x7D459347d092D35f043f73021f06c19f834f8c3E';
    //         const registerOnMumbai = await ethers.getContractAt('Register', registerOnMumbaiAddress);
    //         try {
    //             const tx = await registerOnMumbai.mint(...newCallDataFromArkCircom as any);
    //             console.log('txHash', tx.hash);
    //             const receipt = await tx.wait();
    //             console.log('receipt', receipt)
    //             expect(receipt?.status).to.equal(1);
    //         } catch (error) {
    //             console.error(error);
    //             expect(true).to.equal(false);
    //         }
    //     });

    //     it.skip("Should allow minting using lambda function", async function () {
    //         const registerOnMumbaiAddress = '0x0AAd39A080129763c8E1e2E9DC44E777DB0362a3';
    //         const provider = new ethers.JsonRpcProvider('https://polygon-mumbai-bor.publicnode.com');
    //         const registerOnMumbai = await ethers.getContractAt('Register', registerOnMumbaiAddress);

    //         try {
    //             const transactionRequest = await registerOnMumbai
    //                 .mint.populateTransaction(...callData);

    //             console.log('transactionRequest', transactionRequest);

    //             const apiEndpoint = process.env.AWS_ENDPOINT;
    //             if (!apiEndpoint) {
    //                 throw new Error('AWS_ENDPOINT env variable is not set');
    //             }
    //             const response = await axios.post(apiEndpoint, {
    //                 chain: "mumbai",
    //                 tx_data: transactionRequest
    //             });
    //             console.log('response status', response.status)
    //             console.log('response data', response.data)
    //             const receipt = await provider.waitForTransaction(response.data.hash);
    //             console.log('receipt', receipt)
    //         } catch (err) {
    //             console.log('err', err);
    //         }
    //     });
    // })

});