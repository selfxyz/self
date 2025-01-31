import { expect } from "chai";
import { deploySystemFixtures } from "../utils/deployment";
import { DeployedActors } from "../utils/types";
import { ethers } from "hardhat";
import { generateDscSecret } from "../../../common/src/utils/csca";
import { CIRCUIT_CONSTANTS } from "../utils/constants";
import { RegisterVerifierId, DscVerifierId } from "../../../common/src/constants/constants";
import { PassportProof, VcAndDiscloseHubProof } from "../utils/types";
import { ATTESTATION_ID } from "../utils/constants";
import { generateRegisterProof, generateDscProof, generateVcAndDiscloseProof } from "../utils/generateProof";
import { LeanIMT } from "@openpassport/zk-kit-lean-imt";
import { poseidon2 } from "poseidon-lite";
import { generateCommitment } from "../../../common/src/utils/passports/passport";
import { BigNumberish } from "ethers";
import { generateRandomFieldElement } from "../utils/utils";
import BalanceTree from "../utils/example/balance-tree";
import { castFromScope } from "../../../common/src/utils/circuits/uuid";
import { formatInput } from "../../../common/src/utils/circuits/generateInputs";

describe("Airdrop", () => {
    let deployedActors: DeployedActors;
    let snapshotId: string;
    let airdrop: any;
    let token: any;
    before(async () => {
        deployedActors = await deploySystemFixtures();
        const tokenFactory = await ethers.getContractFactory("AirdropToken");
        token = await tokenFactory.connect(deployedActors.owner).deploy();
        await token.waitForDeployment();

        const airdropFactory = await ethers.getContractFactory("Airdrop");
        airdrop = await airdropFactory.connect(deployedActors.owner).deploy(
            deployedActors.hub.target,
            castFromScope("test-airdrop"),
            ATTESTATION_ID.E_PASSPORT,
            token.target
        );
        await airdrop.waitForDeployment();
        const mintAmount = ethers.parseEther("424242424242");
        await token.mint(airdrop.target, mintAmount);

        snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    afterEach(async () => {
        await ethers.provider.send("evm_revert", [snapshotId]);
        snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    it("should able to open registration by owner", async () => {
        const { owner } = deployedActors;
        const tx = await airdrop.connect(owner).openRegistration();
        const receipt = await tx.wait();
        const event = receipt?.logs.find(
            (log: any) => log.topics[0] === airdrop.interface.getEvent("RegistrationOpen").topicHash
        );
        expect(event).to.not.be.null;
        expect(await airdrop.isRegistrationOpen()).to.be.true;
    });

    it("should not able to open registration by non-owner", async () => {
        const { user1 } = deployedActors;
        await expect(airdrop.connect(user1).openRegistration())
            .to.be.revertedWithCustomError(airdrop, "OwnableUnauthorizedAccount")
            .withArgs(await user1.getAddress());
    });

    it("should able to close registration by owner", async () => {
        const { owner} = deployedActors;
        await airdrop.connect(owner).openRegistration();
        const tx = await airdrop.connect(owner).closeRegistration();
        const receipt = await tx.wait();
        const event = receipt?.logs.find(
            (log: any) => log.topics[0] === airdrop.interface.getEvent("RegistrationClose").topicHash
        );
        expect(event).to.not.be.null;
        expect(await airdrop.isRegistrationOpen()).to.be.false;
    });

    it("should not able to close registration by non-owner", async () => {
        const { user1 } = deployedActors;
        await expect(airdrop.connect(user1).closeRegistration())
            .to.be.revertedWithCustomError(airdrop, "OwnableUnauthorizedAccount")
            .withArgs(await user1.getAddress());
    });

    it("should able to open claim by owner", async () => {
        const { owner} = deployedActors;
        const tx = await airdrop.connect(owner).openClaim();
        const receipt = await tx.wait();

        const event = receipt?.logs.find(
            (log: any) => log.topics[0] === airdrop.interface.getEvent("ClaimOpen").topicHash
        );
        expect(event).to.not.be.null;
        expect(await airdrop.isClaimOpen()).to.be.true;
    });

    it("should not able to open claim by non-owner", async () => {
        const { user1 } = deployedActors;
        await expect(airdrop.connect(user1).openClaim())
            .to.be.revertedWithCustomError(airdrop, "OwnableUnauthorizedAccount")
            .withArgs(await user1.getAddress());
    });

    it("should able to close claim by owner", async () => {
        const { owner } = deployedActors;
        await airdrop.connect(owner).openClaim();
        const tx = await airdrop.connect(owner).closeClaim();
        const receipt = await tx.wait();
        const event = receipt?.logs.find(
            (log: any) => log.topics[0] === airdrop.interface.getEvent("ClaimClose").topicHash
        );
        expect(event).to.not.be.null;
        expect(await airdrop.isClaimOpen()).to.be.false;
    });

    it("should able to set merkle root by owner", async () => {
        const { owner } = deployedActors;
        const merkleRoot = generateRandomFieldElement();
        await airdrop.connect(owner).setMerkleRoot(merkleRoot);
        expect(await airdrop.merkleRoot()).to.be.equal(merkleRoot);
    });

    it("should not able to set merkle root by non-owner", async () => {
        const { user1 } = deployedActors;
        const merkleRoot = generateRandomFieldElement();
        await expect(airdrop.connect(user1).setMerkleRoot(merkleRoot))
            .to.be.revertedWithCustomError(airdrop, "OwnableUnauthorizedAccount")
            .withArgs(await user1.getAddress());
    });

    it("should able to register address by user", async () => {
        const { hub, registry, owner, user1, mockPassport } = deployedActors;

        const registerSecret = generateRandomFieldElement();
        const nullifier = generateRandomFieldElement();

        const commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, mockPassport);

        await registry.connect(owner).devAddIdentityCommitment(
            ATTESTATION_ID.E_PASSPORT,
            nullifier,
            commitment
        );

        const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
        const imt = new LeanIMT<bigint>(hashFunction);
        await imt.insert(BigInt(commitment));

        const vcAndDiscloseProof = await generateVcAndDiscloseProof(
            registerSecret,
            BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
            mockPassport,
            "test-airdrop",
            new Array(88).fill("1"),
            "1",
            imt,
            "20",
        );

        const forbiddenCountriesListPacked = vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX];

        const vcAndDiscloseHubProof = {
            olderThanEnabled: true,
            olderThan: "20",
            forbiddenCountriesEnabled: true,
            forbiddenCountriesListPacked: forbiddenCountriesListPacked,
            ofacEnabled: true,
            vcAndDiscloseProof: vcAndDiscloseProof
        };

        await airdrop.connect(owner).openRegistration();
        const tx = await airdrop.connect(user1).registerAddress(vcAndDiscloseHubProof);
        const receipt = await tx.wait();
        
        const event = receipt?.logs.find(
            (log: any) => log.topics[0] === airdrop.interface.getEvent("AddressRegistered").topicHash
        );
        const eventArgs = event ? airdrop.interface.decodeEventLog(
            "AddressRegistered",
            event.data,
            event.topics
        ) : null;

        expect(eventArgs?.registeredAddress).to.be.equal(await user1.getAddress());

        const appNullifier = vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_NULLIFIER_INDEX];
        expect(eventArgs?.nullifier).to.be.equal(appNullifier);

        const nullifierToAddress = await airdrop.getNullifier(appNullifier);
        expect(nullifierToAddress).to.be.equal(await user1.getAddress());

        const registeredAddresses = await airdrop.getRegisteredAddresses(await user1.getAddress());
        expect(registeredAddresses).to.be.equal(true);
    });

    it("should not able to register address by user if registration is closed", async () => {
        const { hub, registry, owner, user1, mockPassport } = deployedActors;

        const registerSecret = generateRandomFieldElement();
        const nullifier = generateRandomFieldElement();

        const commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, mockPassport);

        await registry.connect(owner).devAddIdentityCommitment(
            ATTESTATION_ID.E_PASSPORT,
            nullifier,
            commitment
        );

        const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
        const imt = new LeanIMT<bigint>(hashFunction);
        await imt.insert(BigInt(commitment));

        const vcAndDiscloseProof = await generateVcAndDiscloseProof(
            registerSecret,
            BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
            mockPassport,
            "test-airdrop",
            new Array(88).fill("1"),
            "1",
            imt,
            "20",
        );

        const forbiddenCountriesListPacked = vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX];

        const vcAndDiscloseHubProof = {
            olderThanEnabled: true,
            olderThan: "20",
            forbiddenCountriesEnabled: true,
            forbiddenCountriesListPacked: forbiddenCountriesListPacked,
            ofacEnabled: true,
            vcAndDiscloseProof: vcAndDiscloseProof
        };

        await airdrop.connect(owner).closeRegistration();
        await expect(airdrop.connect(user1).registerAddress(vcAndDiscloseHubProof))
            .to.be.revertedWithCustomError(airdrop, "RegistrationNotOpen");
    });

    it("should not able to register address by user if scope is invalid", async () => {
        const { hub, registry, owner, user1, mockPassport } = deployedActors;

        const registerSecret = generateRandomFieldElement();
        const nullifier = generateRandomFieldElement();

        const commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, mockPassport);

        await registry.connect(owner).devAddIdentityCommitment(
            ATTESTATION_ID.E_PASSPORT,
            nullifier,
            commitment
        );

        const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
        const imt = new LeanIMT<bigint>(hashFunction);
        await imt.insert(BigInt(commitment));

        const vcAndDiscloseProof = await generateVcAndDiscloseProof(
            registerSecret,
            BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
            mockPassport,
            "test-airdrop-invalid",
            new Array(88).fill("1"),
            "1",
            imt,
            "20",
        );

        const forbiddenCountriesListPacked = vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX];

        const vcAndDiscloseHubProof = {
            olderThanEnabled: true,
            olderThan: "20",
            forbiddenCountriesEnabled: true,
            forbiddenCountriesListPacked: forbiddenCountriesListPacked,
            ofacEnabled: true,
            vcAndDiscloseProof: vcAndDiscloseProof
        };

        await airdrop.connect(owner).openRegistration();
        await expect(airdrop.connect(user1).registerAddress(vcAndDiscloseHubProof))
            .to.be.revertedWithCustomError(airdrop, "InvalidScope");
    });

    it("should not able to register address by user if nullifier is already registered", async () => {
        const { hub, registry, owner, user1, mockPassport } = deployedActors;

        const registerSecret = generateRandomFieldElement();
        const nullifier = generateRandomFieldElement();

        const commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, mockPassport);

        await registry.connect(owner).devAddIdentityCommitment(
            ATTESTATION_ID.E_PASSPORT,
            nullifier,
            commitment
        );

        const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
        const imt = new LeanIMT<bigint>(hashFunction);
        await imt.insert(BigInt(commitment));

        const vcAndDiscloseProof = await generateVcAndDiscloseProof(
            registerSecret,
            BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
            mockPassport,
            "test-airdrop",
            new Array(88).fill("1"),
            "1",
            imt,
            "20",
        );

        const forbiddenCountriesListPacked = vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX];

        const vcAndDiscloseHubProof = {
            olderThanEnabled: true,
            olderThan: "20",
            forbiddenCountriesEnabled: true,
            forbiddenCountriesListPacked: forbiddenCountriesListPacked,
            ofacEnabled: true,
            vcAndDiscloseProof: vcAndDiscloseProof
        };

        await airdrop.connect(owner).openRegistration();
        await airdrop.connect(user1).registerAddress(vcAndDiscloseHubProof);
        await expect(airdrop.connect(user1).registerAddress(vcAndDiscloseHubProof))
            .to.be.revertedWithCustomError(airdrop, "RegisteredNullifier");
    });

    it("should not able to register address by user if attestation id is invalid", async () => {
        const { hub, registry, owner, user1, mockPassport } = deployedActors;

        const registerSecret = generateRandomFieldElement();
        const nullifier = generateRandomFieldElement();

        const commitment = generateCommitment(registerSecret, ATTESTATION_ID.INVALID_ATTESTATION_ID, mockPassport);

        await registry.connect(owner).devAddIdentityCommitment(
            ATTESTATION_ID.INVALID_ATTESTATION_ID,
            nullifier,
            commitment
        );

        const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
        const imt = new LeanIMT<bigint>(hashFunction);
        await imt.insert(BigInt(commitment));

        const vcAndDiscloseProof = await generateVcAndDiscloseProof(
            registerSecret,
            BigInt(ATTESTATION_ID.INVALID_ATTESTATION_ID).toString(),
            mockPassport,
            "test-airdrop",
            new Array(88).fill("1"),
            "1",
            imt,
            "20",
        );

        const forbiddenCountriesListPacked = vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX];

        const vcAndDiscloseHubProof = {
            olderThanEnabled: true,
            olderThan: "20",
            forbiddenCountriesEnabled: true,
            forbiddenCountriesListPacked: forbiddenCountriesListPacked,
            ofacEnabled: true,
            vcAndDiscloseProof: vcAndDiscloseProof
        };

        await airdrop.connect(owner).openRegistration();
        await expect(airdrop.connect(user1).registerAddress(vcAndDiscloseHubProof))
            .to.be.revertedWithCustomError(airdrop, "InvalidAttestationId");
    });

    it("should return correct scope", async () => {
        const scope = await airdrop.getScope();
        expect(scope).to.equal(castFromScope("test-airdrop"));
    });

    it("should return correct attestation id", async () => {
        const attestationId = await airdrop.getAttestationId();
        expect(attestationId).to.equal(ATTESTATION_ID.E_PASSPORT);
    });

    it("should return correct merkle root", async () => {
        const { owner } = deployedActors;
        const merkleRoot = generateRandomFieldElement();
        
        await airdrop.connect(owner).setMerkleRoot(merkleRoot);
        const storedRoot = await airdrop.merkleRoot();
        expect(storedRoot).to.equal(merkleRoot);
    });

    it("should return correct token address", async () => {
        const tokenAddress = await airdrop.token();
        expect(tokenAddress).to.equal(token.target);
    });

    it("should able to claim token by user", async () => {
        const { hub, registry, owner, user1, mockPassport } = deployedActors;

        const registerSecret = generateRandomFieldElement();
        const nullifier = generateRandomFieldElement();

        const commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, mockPassport);

        await registry.connect(owner).devAddIdentityCommitment(
            ATTESTATION_ID.E_PASSPORT,
            nullifier,
            commitment
        );

        const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
        const imt = new LeanIMT<bigint>(hashFunction);
        await imt.insert(BigInt(commitment));

        const vcAndDiscloseProof = await generateVcAndDiscloseProof(
            registerSecret,
            BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
            mockPassport,
            "test-airdrop",
            new Array(88).fill("1"),
            "1",
            imt,
            "20",
        );

        const forbiddenCountriesListPacked = vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX];

        const vcAndDiscloseHubProof = {
            olderThanEnabled: true,
            olderThan: "20",
            forbiddenCountriesEnabled: true,
            forbiddenCountriesListPacked: forbiddenCountriesListPacked,
            ofacEnabled: true,
            vcAndDiscloseProof: vcAndDiscloseProof
        };

        await airdrop.connect(owner).openRegistration();
        await airdrop.connect(user1).registerAddress(vcAndDiscloseHubProof);
        await airdrop.connect(owner).closeRegistration();

        const tree = new BalanceTree([{ account: await user1.getAddress(), amount: BigInt(1000000000000000000) }]);
        const root = tree.getHexRoot();

        await airdrop.connect(owner).setMerkleRoot(root);

        await airdrop.connect(owner).openClaim();
        const merkleProof = tree.getProof(0, await user1.getAddress(), BigInt(1000000000000000000));
        const tx = await airdrop.connect(user1).claim(0, BigInt(1000000000000000000), merkleProof);
        const receipt = await tx.wait();

        const event = receipt?.logs.find(
            (log: any) => log.topics[0] === airdrop.interface.getEvent("Claimed").topicHash
        );
        const eventArgs = event ? airdrop.interface.decodeEventLog(
            "Claimed",
            event.data,
            event.topics
        ) : null;

        expect(eventArgs?.index).to.equal(0);
        expect(eventArgs?.amount).to.equal(BigInt(1000000000000000000));
        expect(eventArgs?.account).to.equal(await user1.getAddress());

        const balance = await token.balanceOf(await user1.getAddress());
        expect(balance).to.equal(BigInt(1000000000000000000));

        const isClaimed = await airdrop.claimed(await user1.getAddress());
        expect(isClaimed).to.be.true;
    });

    it("should not able to claim token by user if registration is not closed", async () => {
        const { hub, registry, owner, user1, mockPassport } = deployedActors;

        const registerSecret = generateRandomFieldElement();
        const nullifier = generateRandomFieldElement();

        const commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, mockPassport);

        await registry.connect(owner).devAddIdentityCommitment(
            ATTESTATION_ID.E_PASSPORT,
            nullifier,
            commitment
        );

        const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
        const imt = new LeanIMT<bigint>(hashFunction);
        await imt.insert(BigInt(commitment));

        const vcAndDiscloseProof = await generateVcAndDiscloseProof(
            registerSecret,
            BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
            mockPassport,
            "test-airdrop",
            new Array(88).fill("1"),
            "1",
            imt,
            "20",
        );

        const forbiddenCountriesListPacked = vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX];

        const vcAndDiscloseHubProof = {
            olderThanEnabled: true,
            olderThan: "20",
            forbiddenCountriesEnabled: true,
            forbiddenCountriesListPacked: forbiddenCountriesListPacked,
            ofacEnabled: true,
            vcAndDiscloseProof: vcAndDiscloseProof
        };

        await airdrop.connect(owner).openRegistration();
        await airdrop.connect(user1).registerAddress(vcAndDiscloseHubProof);

        const tree = new BalanceTree([{ account: await user1.getAddress(), amount: BigInt(1000000000000000000) }]);
        const root = tree.getHexRoot();

        await airdrop.connect(owner).setMerkleRoot(root);

        await airdrop.connect(owner).openClaim();
        const merkleProof = tree.getProof(0, await user1.getAddress(), BigInt(1000000000000000000));
        await expect(airdrop.connect(user1).claim(0, BigInt(1000000000000000000), merkleProof))
            .to.be.revertedWithCustomError(airdrop, "RegistrationNotClosed");

        const isClaimed = await airdrop.claimed(await user1.getAddress());
        expect(isClaimed).to.be.false;
    });

    it("should not able to claim token by user if claim is not open", async () => {
        const { hub, registry, owner, user1, mockPassport } = deployedActors;

        const registerSecret = generateRandomFieldElement();
        const nullifier = generateRandomFieldElement();

        const commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, mockPassport);

        await registry.connect(owner).devAddIdentityCommitment(
            ATTESTATION_ID.E_PASSPORT,
            nullifier,
            commitment
        );

        const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
        const imt = new LeanIMT<bigint>(hashFunction);
        await imt.insert(BigInt(commitment));

        const vcAndDiscloseProof = await generateVcAndDiscloseProof(
            registerSecret,
            BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
            mockPassport,
            "test-airdrop",
            new Array(88).fill("1"),
            "1",
            imt,
            "20",
        );

        const forbiddenCountriesListPacked = vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX];

        const vcAndDiscloseHubProof = {
            olderThanEnabled: true,
            olderThan: "20",
            forbiddenCountriesEnabled: true,
            forbiddenCountriesListPacked: forbiddenCountriesListPacked,
            ofacEnabled: true,
            vcAndDiscloseProof: vcAndDiscloseProof
        };

        await airdrop.connect(owner).openRegistration();
        await airdrop.connect(user1).registerAddress(vcAndDiscloseHubProof);
        await airdrop.connect(owner).closeRegistration();

        const tree = new BalanceTree([{ account: await user1.getAddress(), amount: BigInt(1000000000000000000) }]);
        const root = tree.getHexRoot();

        await airdrop.connect(owner).setMerkleRoot(root);

        const merkleProof = tree.getProof(0, await user1.getAddress(), BigInt(1000000000000000000));
        await expect(airdrop.connect(user1).claim(0, BigInt(1000000000000000000), merkleProof))
            .to.be.revertedWithCustomError(airdrop, "ClaimNotOpen");

        const isClaimed = await airdrop.claimed(await user1.getAddress());
        expect(isClaimed).to.be.false;
    });

    it("should not able to claim token by user if user has already claimed", async () => {
        const { hub, registry, owner, user1, mockPassport } = deployedActors;

        const registerSecret = generateRandomFieldElement();
        const nullifier = generateRandomFieldElement();

        const commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, mockPassport);

        await registry.connect(owner).devAddIdentityCommitment(
            ATTESTATION_ID.E_PASSPORT,
            nullifier,
            commitment
        );

        const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
        const imt = new LeanIMT<bigint>(hashFunction);
        await imt.insert(BigInt(commitment));

        const vcAndDiscloseProof = await generateVcAndDiscloseProof(
            registerSecret,
            BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
            mockPassport,
            "test-airdrop",
            new Array(88).fill("1"),
            "1",
            imt,
            "20",
        );

        const forbiddenCountriesListPacked = vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX];

        const vcAndDiscloseHubProof = {
            olderThanEnabled: true,
            olderThan: "20",
            forbiddenCountriesEnabled: true,
            forbiddenCountriesListPacked: forbiddenCountriesListPacked,
            ofacEnabled: true,
            vcAndDiscloseProof: vcAndDiscloseProof
        };

        await airdrop.connect(owner).openRegistration();
        await airdrop.connect(user1).registerAddress(vcAndDiscloseHubProof);
        await airdrop.connect(owner).closeRegistration();
        const tree = new BalanceTree([{ account: await user1.getAddress(), amount: BigInt(1000000000000000000) }]);
        const root = tree.getHexRoot();

        await airdrop.connect(owner).setMerkleRoot(root);

        await airdrop.connect(owner).openClaim();
        const merkleProof = tree.getProof(0, await user1.getAddress(), BigInt(1000000000000000000));
        await airdrop.connect(user1).claim(0, BigInt(1000000000000000000), merkleProof);
        await expect(airdrop.connect(user1).claim(0, BigInt(1000000000000000000), merkleProof))
            .to.be.revertedWithCustomError(airdrop, "AlreadyClaimed");


        const balance = await token.balanceOf(await user1.getAddress());
        expect(balance).to.equal(BigInt(1000000000000000000));

        const isClaimed = await airdrop.claimed(await user1.getAddress());
        expect(isClaimed).to.be.true;
    });

    it("should not able to claim token by user if merkle proof is invalid", async () => {
        const { hub, registry, owner, user1, mockPassport } = deployedActors;

        const registerSecret = generateRandomFieldElement();
        const nullifier = generateRandomFieldElement();

        const commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, mockPassport);

        await registry.connect(owner).devAddIdentityCommitment(
            ATTESTATION_ID.E_PASSPORT,
            nullifier,
            commitment
        );

        const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
        const imt = new LeanIMT<bigint>(hashFunction);
        await imt.insert(BigInt(commitment));

        const vcAndDiscloseProof = await generateVcAndDiscloseProof(
            registerSecret,
            BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
            mockPassport,
            "test-airdrop",
            new Array(88).fill("1"),
            "1",
            imt,
            "20",
        );

        const forbiddenCountriesListPacked = vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX];

        const vcAndDiscloseHubProof = {
            olderThanEnabled: true,
            olderThan: "20",
            forbiddenCountriesEnabled: true,
            forbiddenCountriesListPacked: forbiddenCountriesListPacked,
            ofacEnabled: true,
            vcAndDiscloseProof: vcAndDiscloseProof
        };

        await airdrop.connect(owner).openRegistration();
        await airdrop.connect(user1).registerAddress(vcAndDiscloseHubProof);
        await airdrop.connect(owner).closeRegistration();
        const tree = new BalanceTree([{ account: await user1.getAddress(), amount: BigInt(1000000000000000000) }]);
        const root = tree.getHexRoot();

        await airdrop.connect(owner).setMerkleRoot(root);

        await airdrop.connect(owner).openClaim();
        const merkleProof = tree.getProof(0, await user1.getAddress(), BigInt(1000000000000000000));
        merkleProof[0] = generateRandomFieldElement().toString();
        await expect(airdrop.connect(user1).claim(0, BigInt(1000000000000000000), merkleProof))
            .to.be.revertedWithCustomError(airdrop, "InvalidProof");

        const isClaimed = await airdrop.claimed(await user1.getAddress());
        expect(isClaimed).to.be.false;
    });
});
