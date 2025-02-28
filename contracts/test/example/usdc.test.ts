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
import { genMockPassportData } from "../../../common/src/utils/passports/genMockPassportData";

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
    let hashFunction: any;

    before(async () => {
        deployedActors = await deploySystemFixtures();

        registerSecret = generateRandomFieldElement();
        nullifier = generateRandomFieldElement();
        commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, deployedActors.mockPassport);

        forbiddenCountriesList = ['AAA', 'ABC', 'CBA'];
        
        hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
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
            false,
            20,
            false,
            [0,0,0,0],
            [false, false, false]
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
        imt = new LeanIMT<bigint>(hashFunction);
        await imt.insert(BigInt(commitment));
        snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    it("should successfully verify self proof", async () => {
        const { user1 } = deployedActors;
        
        // Verify the proof
        const tx = await usdcDistribution.connect(user1).verifySelfProof(vcAndDiscloseProof);
        const receipt = await tx.wait();
        
        // Get the verification event
        const event = receipt?.logs.find(
            (log: any) => log.topics[0] === usdcDistribution.interface.getEvent("USDCClaimed").topicHash
        );
        
        expect(event).to.not.be.undefined;
        
        // Verify USDC token is set correctly
        const tokenAddress = await usdcDistribution.usdc();
        expect(tokenAddress).to.equal(usdc.target);
        
        // Verify the CLAIMABLE_AMOUNT constant
        const claimableAmount = BigInt(100000000);
        
        // Check if user received the USDC tokens
        const userBalance = await usdc.balanceOf(await user1.getAddress());
        expect(userBalance).to.equal(claimableAmount);
    });

    it("should claim +5 days proof", async () => {
        const { user1, registry } = deployedActors;

        const mockPassport = genMockPassportData(
            "sha256",
            "sha256",
            "rsa_sha256_65537_2048",
            "FRA",
            "940305", 
            "401031"
        );
        const registerSecret2 = generateRandomFieldElement();
        const nullifier2 = generateRandomFieldElement();
        const commitment2 = generateCommitment(registerSecret2, ATTESTATION_ID.E_PASSPORT, mockPassport);

        console.log("imt root: ", imt.root);
        await imt.insert(BigInt(commitment2));
        console.log("imt root2: ", imt.root);
        await deployedActors.registry.connect(deployedActors.owner).devAddIdentityCommitment(
            ATTESTATION_ID.E_PASSPORT,
            nullifier2,
            commitment2
        );

        const proof = await generateVcAndDiscloseProof(
            registerSecret2,
            BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
            mockPassport,
            "test-usdc-distribution", // Different from "test-usdc-distribution"
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

        const tx = await usdcDistribution.connect(user1).verifySelfProof(proof);
        const receipt = await tx.wait();
        
        // Get the verification event
        const event = receipt?.logs.find(
            (log: any) => log.topics[0] === usdcDistribution.interface.getEvent("USDCClaimed").topicHash
        );
        
        expect(event).to.not.be.undefined;
        
        // Verify USDC token is set correctly
        const tokenAddress = await usdcDistribution.usdc();
        expect(tokenAddress).to.equal(usdc.target);
        
        // Verify the CLAIMABLE_AMOUNT constant
        const claimableAmount = BigInt(100000000);
        
        // Check if user received the USDC tokens
        const userBalance = await usdc.balanceOf(await user1.getAddress());
        expect(userBalance).to.equal(claimableAmount);
        
    });

    it("should claim -5 days proof", async () => {
        const { user1, registry } = deployedActors;

        const mockPassport = genMockPassportData(
            "sha256",
            "sha256",
            "rsa_sha256_65537_2048",
            "FRA",
            "940224", 
            "401031"
        );
        const registerSecret3 = generateRandomFieldElement();
        const nullifier3 = generateRandomFieldElement();
        const commitment3 = generateCommitment(registerSecret3, ATTESTATION_ID.E_PASSPORT, mockPassport);

        await imt.insert(BigInt(commitment3));
        await deployedActors.registry.connect(deployedActors.owner).devAddIdentityCommitment(
            ATTESTATION_ID.E_PASSPORT,
            nullifier3,
            commitment3
        );

        const proof = await generateVcAndDiscloseProof(
            registerSecret3,
            BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
            mockPassport,
            "test-usdc-distribution", // Different from "test-usdc-distribution"
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

        const tx = await usdcDistribution.connect(user1).verifySelfProof(proof);
        const receipt = await tx.wait();
        
        // Get the verification event
        const event = receipt?.logs.find(
            (log: any) => log.topics[0] === usdcDistribution.interface.getEvent("USDCClaimed").topicHash
        );
        
        expect(event).to.not.be.undefined;
        
        // Verify USDC token is set correctly
        const tokenAddress = await usdcDistribution.usdc();
        expect(tokenAddress).to.equal(usdc.target);
        
        // Verify the CLAIMABLE_AMOUNT constant
        const claimableAmount = BigInt(100000000);
        
        // Check if user received the USDC tokens
        const userBalance = await usdc.balanceOf(await user1.getAddress());
        expect(userBalance).to.equal(claimableAmount);
        
    });



    it("should not claim -6 days proof", async () => {
        const { user1, registry } = deployedActors;

        const mockPassport = genMockPassportData(
            "sha256",
            "sha256",
            "rsa_sha256_65537_2048",
            "FRA",
            "940223", 
            "401031"
        );
        const registerSecret4 = generateRandomFieldElement();
        const nullifier4 = generateRandomFieldElement();
        const commitment4 = generateCommitment(registerSecret4, ATTESTATION_ID.E_PASSPORT, mockPassport);

        await imt.insert(BigInt(commitment4));
        await deployedActors.registry.connect(deployedActors.owner).devAddIdentityCommitment(
            ATTESTATION_ID.E_PASSPORT,
            nullifier4,
            commitment4
        );

        const proof = await generateVcAndDiscloseProof(
            registerSecret4,
            BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
            mockPassport,
            "test-usdc-distribution", // Different from "test-usdc-distribution"
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

        await expect(usdcDistribution.connect(user1).verifySelfProof(proof)).to.be.revertedWith("Not eligible: Not within 5 days of birthday");
    });

    it("should not claim +6 days proof", async () => {
        const { user1, registry } = deployedActors;

        const mockPassport = genMockPassportData(
            "sha256",
            "sha256",
            "rsa_sha256_65537_2048",
            "FRA",
            "940306", 
            "401031"
        );
        const registerSecret6 = generateRandomFieldElement();
        const nullifier6 = generateRandomFieldElement();
        const commitment6 = generateCommitment(registerSecret6, ATTESTATION_ID.E_PASSPORT, mockPassport);

        console.log("imt root: ", imt.root);
        await imt.insert(BigInt(commitment6));
        console.log("imt root2: ", imt.root);
        await deployedActors.registry.connect(deployedActors.owner).devAddIdentityCommitment(
            ATTESTATION_ID.E_PASSPORT,
            nullifier6,
            commitment6
        );

        const proof = await generateVcAndDiscloseProof(
            registerSecret6,
            BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
            mockPassport,
            "test-usdc-distribution", // Different from "test-usdc-distribution"
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

        await expect(usdcDistribution.connect(user1).verifySelfProof(proof)).to.be.revertedWith("Not eligible: Not within 5 days of birthday");;
    });

    it("should not allow double claiming with same nullifier", async () => {
        const { user1 } = deployedActors;
        
        // First claim should succeed
        await usdcDistribution.connect(user1).verifySelfProof(vcAndDiscloseProof);
        
        // Second attempt should fail
        await expect(
            usdcDistribution.connect(user1).verifySelfProof(vcAndDiscloseProof)
        ).to.be.reverted;
    });

    it("should allow owner to withdraw USDC", async () => {
        const { owner } = deployedActors;
        const withdrawalAmount = ethers.parseEther("1000");
        const initialBalance = await usdc.balanceOf(await owner.getAddress());
        
        // Owner withdraws USDC
        await usdcDistribution.connect(owner).withdrawUSDC(await owner.getAddress(), withdrawalAmount);
        
        // Check owner's balance increased
        const finalBalance = await usdc.balanceOf(await owner.getAddress());
        expect(finalBalance - initialBalance).to.equal(withdrawalAmount);
    });

    it("should not allow non-owner to withdraw USDC", async () => {
        const { user1 } = deployedActors;
        const withdrawalAmount = ethers.parseEther("1000");
        
        // User attempts to withdraw USDC
        await expect(
            usdcDistribution.connect(user1).withdrawUSDC(await user1.getAddress(), withdrawalAmount)
        ).to.be.revertedWithCustomError(usdcDistribution, "OwnableUnauthorizedAccount")
        .withArgs(await user1.getAddress());
    });

    it("should verify correct USDC token address", async () => {
        const tokenAddress = await usdcDistribution.usdc();
        expect(tokenAddress).to.equal(usdc.target);
    });

    it("should handle invalid scope gracefully", async () => {
        const { user1 } = deployedActors;
        
        // Generate a new proof with invalid scope
        const invalidScopeProof = await generateVcAndDiscloseProof(
            registerSecret,
            BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
            deployedActors.mockPassport,
            "invalid-scope", // Different from "test-usdc-distribution"
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
        
        // Verify the proof with invalid scope gets rejected
        await expect(
            usdcDistribution.connect(user1).verifySelfProof(invalidScopeProof)
        ).to.be.reverted;
    });

    it("should handle invalid attestation ID gracefully", async () => {
        const { user1, registry, owner } = deployedActors;
        
        // Create a new commitment with invalid attestation ID
        const invalidAttestationId = ATTESTATION_ID.INVALID_ATTESTATION_ID;
        const invalidCommitment = generateCommitment(registerSecret, invalidAttestationId, deployedActors.mockPassport);
        
        // Register the identity commitment with invalid attestation ID
        await registry.connect(owner).devAddIdentityCommitment(
            invalidAttestationId,
            nullifier,
            invalidCommitment
        );
        
        // Create a new IMT with the invalid commitment
        const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
        const invalidImt = new LeanIMT<bigint>(hashFunction);
        await invalidImt.insert(BigInt(invalidCommitment));
        
        // Generate a proof with the invalid attestation ID
        const invalidAttestationProof = await generateVcAndDiscloseProof(
            registerSecret,
            BigInt(invalidAttestationId).toString(),
            deployedActors.mockPassport,
            "test-usdc-distribution",
            new Array(88).fill("1"),
            "1",
            invalidImt,
            "20",
            undefined,
            undefined,
            undefined,
            undefined,
            forbiddenCountriesList,
            (await deployedActors.user1.getAddress()).slice(2)
        );
        
        // Verify the proof with invalid attestation ID gets rejected
        await expect(
            usdcDistribution.connect(user1).verifySelfProof(invalidAttestationProof)
        ).to.be.reverted;
    });

    it("should handle zero user identifier gracefully", async () => {
        const { user1 } = deployedActors;
        
        // Generate a proof with zero user identifier
        const zeroUserIdProof = await generateVcAndDiscloseProof(
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
            "0000000000000000000000000000000000000000" // Zero address
        );
        
        // Verify the proof with zero user identifier gets rejected
        await expect(
            usdcDistribution.connect(user1).verifySelfProof(zeroUserIdProof)
        ).to.be.reverted;
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