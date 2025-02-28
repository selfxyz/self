import { expect } from "chai";
import { deploySystemFixtures } from "../utils/deployment";
import { DeployedActors } from "../utils/types";
import { ethers } from "hardhat";
import { CIRCUIT_CONSTANTS } from "../../../common/src/constants/constants";
import { ATTESTATION_ID } from "../utils/constants";
import { generateVcAndDiscloseProof } from "../utils/generateProof";
import { LeanIMT } from "@openpassport/zk-kit-lean-imt";
import { poseidon2 } from "poseidon-lite";
import { generateCommitment } from "../../../common/src/utils/passports/passport";
import { generateRandomFieldElement } from "../utils/utils";
import { castFromScope } from "../../../common/src/utils/circuits/uuid";
import { formatCountriesList, reverseBytes } from '../../../common/src/utils/circuits/formatInputs';
import { Formatter } from "../utils/formatter";

describe("USDCDistribution", () => {
    let deployedActors: DeployedActors;
    let snapshotId: string;
    let usdcDistribution: any;
    let usdc: any;
    let vcAndDiscloseProof: any;
    let registerSecret: any;
    let imt: any;
    let commitment: any;
    let nullifier: any;
    let forbiddenCountriesList: any;
    let countriesListPacked: any;

    before(async () => {
        deployedActors = await deploySystemFixtures();

        registerSecret = generateRandomFieldElement();
        nullifier = generateRandomFieldElement();
        commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, deployedActors.mockPassport);

        forbiddenCountriesList = ['AAA', 'ABC', 'CBA'];
        
        const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
        imt = new LeanIMT<bigint>(hashFunction);
        await imt.insert(BigInt(commitment));

        // Create USDC token
        const tokenFactory = await ethers.getContractFactory("AirdropToken");
        usdc = await tokenFactory.connect(deployedActors.owner).deploy();
        await usdc.waitForDeployment();

        // Register the identity commitment
        await deployedActors.registry.connect(deployedActors.owner).devAddIdentityCommitment(
            ATTESTATION_ID.E_PASSPORT,
            nullifier,
            commitment
        );

        countriesListPacked = splitHexFromBack(reverseBytes(Formatter.bytesToHexString(new Uint8Array(formatCountriesList(forbiddenCountriesList)))));

        // Deploy USDCDistribution contract
        const usdcDistributionFactory = await ethers.getContractFactory("USDCDistribution");
        usdcDistribution = await usdcDistributionFactory.connect(deployedActors.owner).deploy(
            deployedActors.hub.target,
            castFromScope("test-usdc-distribution"),
            ATTESTATION_ID.E_PASSPORT,
            usdc.target,
            true,
            20,
            true,
            countriesListPacked,
            [true, true, true]
        );
        await usdcDistribution.waitForDeployment();
        
        // Fund the contract with USDC
        const mintAmount = ethers.parseEther("1000000");
        await usdc.mint(usdcDistribution.target, mintAmount);

        // Generate proof for verification
        vcAndDiscloseProof = await generateVcAndDiscloseProof(
            registerSecret,
            BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
            deployedActors.mockPassport,
            "test-usdc-distribution",
            new Array(88).fill("1"),
            "1",
            imt,
            "20",
            undefined,
            undefined,
            undefined,
            undefined,
            forbiddenCountriesList,
            (await deployedActors.user1.getAddress()).slice(2)
        );

        snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    afterEach(async () => {
        await ethers.provider.send("evm_revert", [snapshotId]);
        snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    it("should successfully verify self proof", async () => {
        const { user1 } = deployedActors;
        
        // Verify the proof
        const tx = await usdcDistribution.connect(user1).verifySelfProof(vcAndDiscloseProof);
        console.log("tx: ", tx);
        // const receipt = await tx.wait();
        
        // // Get the verification event
        // const event = receipt?.logs.find(
        //     (log: any) => log.topics[0] === usdcDistribution.interface.getEvent("ProofVerified").topicHash
        // );
        
        // expect(event).to.not.be.null;
        
        // // Verify USDC token is set correctly
        // const tokenAddress = await usdcDistribution.usdc();
        // expect(tokenAddress).to.equal(usdc.target);
        
        // // Verify the CLAIMABLE_AMOUNT constant
        // const claimableAmount = await usdcDistribution.CLAIMABLE_AMOUNT();
        // expect(claimableAmount).to.equal(100000000);
    });
});

// Helper function copied from airdrop.test.ts
function splitHexFromBack(hex: string): [string, string, string, string] {
    const paddedHex = hex.padStart(64, '0');
    return [
        '0x' + paddedHex.substring(0, 16),
        '0x' + paddedHex.substring(16, 32),
        '0x' + paddedHex.substring(32, 48),
        '0x' + paddedHex.substring(48, 64)
    ] as [string, string, string, string];
} 