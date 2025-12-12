import { expect } from "chai";
import { BigNumberish, TransactionReceipt } from "ethers";
import { ethers } from "hardhat";
import { poseidon2 } from "poseidon-lite";
import { createHash } from "crypto";
import { CIRCUIT_CONSTANTS, DscVerifierId, RegisterVerifierId } from "@selfxyz/common/constants/constants";
import { formatCountriesList, reverseBytes } from "@selfxyz/common/utils/circuits/formatInputs";
import { castFromScope } from "@selfxyz/common/utils/circuits/uuid";
import { ATTESTATION_ID } from "../utils/constants";
import { deploySystemFixturesV2 } from "../utils/deploymentV2";
import BalanceTree from "../utils/example/balance-tree";
import { Formatter } from "../utils/formatter";
import { generateDscProof, generateRegisterProof, generateVcAndDiscloseProof } from "../utils/generateProof";
import serialized_dsc_tree from "../../../common/pubkeys/serialized_dsc_tree.json";
import { DeployedActorsV2 } from "../utils/types";
import { generateRandomFieldElement, splitHexFromBack } from "../utils/utils";

// Helper function to calculate user identifier hash
function calculateUserIdentifierHash(userContextData: string): string {
  const sha256Hash = createHash("sha256")
    .update(Buffer.from(userContextData.slice(2), "hex"))
    .digest();
  const ripemdHash = createHash("ripemd160").update(sha256Hash).digest();
  return "0x" + ripemdHash.toString("hex").padStart(40, "0");
}

// Helper function to create V2 proof data format for verifySelfProof
function createV2ProofData(proof: any, userAddress: string, userData: string = "airdrop-user-data") {
  const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
  const userContextData = ethers.solidityPacked(
    ["bytes32", "bytes32", "bytes"],
    [destChainId, ethers.zeroPadValue(userAddress, 32), ethers.toUtf8Bytes(userData)],
  );

  const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ATTESTATION_ID.E_PASSPORT)), 32);
  const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
    ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
    [[proof.a, proof.b, proof.c, proof.pubSignals]],
  );

  const proofData = ethers.solidityPacked(["bytes32", "bytes"], [attestationId, encodedProof]);

  return { proofData, userContextData };
}

describe("End to End Tests", function () {
  this.timeout(0);

  let deployedActors: DeployedActorsV2;
  let snapshotId: string;

  before(async () => {
    deployedActors = await deploySystemFixturesV2();
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshotId]);
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  it("register dsc key commitment, register identity commitment, verify commitment and disclose attrs and claim airdrop", async () => {
    const { hub, registry, mockPassport, owner, user1, testSelfVerificationRoot, poseidonT3 } = deployedActors;

    // V2 hub requires attestationId as bytes32
    const attestationIdBytes32 = ethers.zeroPadValue(ethers.toBeHex(BigInt(ATTESTATION_ID.E_PASSPORT)), 32);

    // register dsc key
    // To increase test performance, we will just set one dsc key with groth16 proof
    // Other commitments are registered by dev function
    const dscKeys = JSON.parse(serialized_dsc_tree);
    let registerDscTx;
    const dscProof = await generateDscProof(mockPassport);
    const registerSecret = generateRandomFieldElement();
    for (let i = 0; i < dscKeys[0].length; i++) {
      if (BigInt(dscKeys[0][i]) == dscProof.pubSignals[CIRCUIT_CONSTANTS.DSC_TREE_LEAF_INDEX]) {
        const previousRoot = await registry.getDscKeyCommitmentMerkleRoot();
        const previousSize = await registry.getDscKeyCommitmentTreeSize();
        registerDscTx = await hub.registerDscKeyCommitment(
          attestationIdBytes32,
          DscVerifierId.dsc_sha256_rsa_65537_4096,
          dscProof,
        );
        const receipt = (await registerDscTx.wait()) as TransactionReceipt;
        const event = receipt?.logs.find(
          (log) => log.topics[0] === registry.interface.getEvent("DscKeyCommitmentRegistered").topicHash,
        );
        const eventArgs = event
          ? registry.interface.decodeEventLog("DscKeyCommitmentRegistered", event.data, event.topics)
          : null;

        const blockTimestamp = (await ethers.provider.getBlock(receipt.blockNumber))!.timestamp;
        const currentRoot = await registry.getDscKeyCommitmentMerkleRoot();
        const index = await registry.getDscKeyCommitmentIndex(
          dscProof.pubSignals[CIRCUIT_CONSTANTS.DSC_TREE_LEAF_INDEX],
        );

        expect(eventArgs?.commitment).to.equal(dscProof.pubSignals[CIRCUIT_CONSTANTS.DSC_TREE_LEAF_INDEX]);
        expect(eventArgs?.timestamp).to.equal(blockTimestamp);
        expect(eventArgs?.imtRoot).to.equal(currentRoot);
        expect(eventArgs?.imtIndex).to.equal(index);

        // Check state
        expect(currentRoot).to.not.equal(previousRoot);
        expect(await registry.getDscKeyCommitmentTreeSize()).to.equal(previousSize + 1n);
        expect(
          await registry.getDscKeyCommitmentIndex(dscProof.pubSignals[CIRCUIT_CONSTANTS.DSC_TREE_LEAF_INDEX]),
        ).to.equal(index);
        expect(
          await registry.isRegisteredDscKeyCommitment(dscProof.pubSignals[CIRCUIT_CONSTANTS.DSC_TREE_LEAF_INDEX]),
        ).to.equal(true);
      } else {
        await registry.devAddDscKeyCommitment(BigInt(dscKeys[0][i]));
      }
    }

    // register identity commitment
    const registerProof = await generateRegisterProof(registerSecret, mockPassport);

    const previousRoot = await registry.getIdentityCommitmentMerkleRoot();

    const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
    // must be imported dynamic since @openpassport/zk-kit-lean-imt is exclusively esm and hardhat does not support esm with typescript until verison 3
    const LeanIMT = await import("@openpassport/zk-kit-lean-imt").then((mod) => mod.LeanIMT);
    const imt = new LeanIMT<bigint>(hashFunction);
    await imt.insert(BigInt(registerProof.pubSignals[CIRCUIT_CONSTANTS.REGISTER_COMMITMENT_INDEX]));

    const tx = await hub.registerCommitment(
      attestationIdBytes32,
      RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096,
      registerProof,
    );
    const receipt = (await tx.wait()) as TransactionReceipt;
    const blockTimestamp = (await ethers.provider.getBlock(receipt.blockNumber))!.timestamp;

    const currentRoot = await registry.getIdentityCommitmentMerkleRoot();
    const size = await registry.getIdentityCommitmentMerkleTreeSize();
    const rootTimestamp = await registry.rootTimestamps(currentRoot);
    const index = await registry.getIdentityCommitmentIndex(
      registerProof.pubSignals[CIRCUIT_CONSTANTS.REGISTER_COMMITMENT_INDEX],
    );
    const identityNullifier = await registry.nullifiers(
      attestationIdBytes32,
      registerProof.pubSignals[CIRCUIT_CONSTANTS.REGISTER_NULLIFIER_INDEX],
    );

    const event = receipt?.logs.find(
      (log) => log.topics[0] === registry.interface.getEvent("CommitmentRegistered").topicHash,
    );
    const eventArgs = event
      ? registry.interface.decodeEventLog("CommitmentRegistered", event.data, event.topics)
      : null;

    expect(eventArgs?.attestationId).to.equal(ATTESTATION_ID.E_PASSPORT);
    expect(eventArgs?.nullifier).to.equal(registerProof.pubSignals[CIRCUIT_CONSTANTS.REGISTER_NULLIFIER_INDEX]);
    expect(eventArgs?.commitment).to.equal(registerProof.pubSignals[CIRCUIT_CONSTANTS.REGISTER_COMMITMENT_INDEX]);
    expect(eventArgs?.timestamp).to.equal(blockTimestamp);
    expect(eventArgs?.imtRoot).to.equal(currentRoot);
    expect(eventArgs?.imtIndex).to.equal(0);

    expect(currentRoot).to.not.equal(previousRoot);
    expect(currentRoot).to.be.equal(imt.root);
    expect(size).to.equal(1);
    expect(rootTimestamp).to.equal(blockTimestamp);
    expect(index).to.equal(0);
    expect(identityNullifier).to.equal(true);

    const forbiddenCountriesList = ["AAA", "ABC", "CBA"];
    const countriesListPacked = splitHexFromBack(
      reverseBytes(Formatter.bytesToHexString(new Uint8Array(formatCountriesList(forbiddenCountriesList)))),
    );

    // Get the scope from testSelfVerificationRoot
    const testRootScope = await testSelfVerificationRoot.scope();

    // Calculate user identifier hash for verification
    const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
    const user1Address = await user1.getAddress();
    const userData = ethers.toUtf8Bytes("test-user-data");
    const tempUserContextData = ethers.solidityPacked(
      ["bytes32", "bytes32", "bytes"],
      [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
    );
    const userIdentifierHash = calculateUserIdentifierHash(tempUserContextData);

    // Generate proof for V2 verification
    const vcAndDiscloseProof = await generateVcAndDiscloseProof(
      registerSecret,
      BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
      mockPassport,
      testRootScope.toString(),
      new Array(88).fill("1"),
      "1",
      imt,
      "20",
      undefined,
      undefined,
      undefined,
      undefined,
      forbiddenCountriesList,
      userIdentifierHash,
    );

    // Set up verification config for testSelfVerificationRoot
    const verificationConfigV2 = {
      olderThanEnabled: true,
      olderThan: "20",
      forbiddenCountriesEnabled: true,
      forbiddenCountriesListPacked: countriesListPacked as [BigNumberish, BigNumberish, BigNumberish, BigNumberish],
      ofacEnabled: [true, true, true] as [boolean, boolean, boolean],
    };

    await testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);

    // Create V2 proof format and verify via testSelfVerificationRoot
    const { proofData, userContextData: verifyUserContextData } = createV2ProofData(
      vcAndDiscloseProof,
      user1Address,
      "test-user-data",
    );

    // Reset test state before verification
    await testSelfVerificationRoot.resetTestState();

    // Verify the proof through V2 architecture
    await testSelfVerificationRoot.connect(user1).verifySelfProof(proofData, verifyUserContextData);

    // Check verification was successful
    expect(await testSelfVerificationRoot.verificationSuccessful()).to.equal(true);

    // Get the verification output and verify it
    const lastOutput = await testSelfVerificationRoot.lastOutput();
    expect(lastOutput).to.not.equal("0x");

    // Verify attestationId matches both the expected bytes32 and the proof pubSignals
    expect(lastOutput.attestationId).to.equal(attestationIdBytes32);
    expect(lastOutput.attestationId).to.equal(
      ethers.zeroPadValue(
        ethers.toBeHex(vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_ATTESTATION_ID_INDEX]),
        32,
      ),
    );

    // Verify nullifier matches the proof pubSignals
    expect(lastOutput.nullifier).to.equal(
      vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_NULLIFIER_INDEX],
    );

    // Verify userIdentifier is set
    expect(lastOutput.userIdentifier).to.not.equal(0n);

    // Verify olderThan value
    expect(lastOutput.olderThan).to.equal(20n);

    const tokenFactory = await ethers.getContractFactory("AirdropToken");
    const token = await tokenFactory.connect(owner).deploy();
    await token.waitForDeployment();

    const airdropFactory = await ethers.getContractFactory("Airdrop");
    const airdrop = await airdropFactory.connect(owner).deploy(hub.target, "test-scope", token.target);
    await airdrop.waitForDeployment();

    // Set up verification config for the airdrop
    const configTx = await hub.connect(owner).setVerificationConfigV2(verificationConfigV2);
    const configReceipt = await configTx.wait();
    const configId = configReceipt!.logs[0].topics[1];

    // Set the config ID in the airdrop contract
    await airdrop.connect(owner).setConfigId(configId);

    await token.connect(owner).mint(airdrop.target, BigInt(1000000000000000000));

    // Generate proof with the airdrop's actual scope
    const airdropScope = await airdrop.scope();

    // Calculate the user identifier hash for the airdrop proof
    const airdropUserData = ethers.toUtf8Bytes("airdrop-user-data");
    const airdropTempUserContextData = ethers.solidityPacked(
      ["bytes32", "bytes32", "bytes"],
      [destChainId, ethers.zeroPadValue(user1Address, 32), airdropUserData],
    );
    const airdropUserIdentifierHash = calculateUserIdentifierHash(airdropTempUserContextData);

    const airdropVcAndDiscloseProof = await generateVcAndDiscloseProof(
      registerSecret,
      BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
      mockPassport,
      airdropScope.toString(),
      new Array(88).fill("1"),
      "1",
      imt,
      "20",
      undefined,
      undefined,
      undefined,
      undefined,
      forbiddenCountriesList,
      airdropUserIdentifierHash,
    );

    await airdrop.connect(owner).openRegistration();

    // Create V2 proof format for verifySelfProof
    const { proofData: airdropProofData, userContextData: airdropUserContextData } = createV2ProofData(
      airdropVcAndDiscloseProof,
      await user1.getAddress(),
    );
    await airdrop.connect(user1).verifySelfProof(airdropProofData, airdropUserContextData);
    await airdrop.connect(owner).closeRegistration();

    const tree = new BalanceTree([{ account: await user1.getAddress(), amount: BigInt(1000000000000000000) }]);
    const merkleRoot = tree.getHexRoot();
    await airdrop.connect(owner).setMerkleRoot(merkleRoot);
    await airdrop.connect(owner).openClaim();
    const merkleProof = tree.getProof(0, await user1.getAddress(), BigInt(1000000000000000000));
    const claimTx = await airdrop.connect(user1).claim(0, BigInt(1000000000000000000), merkleProof);
    const claimReceipt = (await claimTx.wait()) as TransactionReceipt;

    const claimEvent = claimReceipt?.logs.find(
      (log) => log.topics[0] === airdrop.interface.getEvent("Claimed").topicHash,
    );
    const claimEventArgs = claimEvent
      ? airdrop.interface.decodeEventLog("Claimed", claimEvent.data, claimEvent.topics)
      : null;

    expect(claimEventArgs?.index).to.equal(0);
    expect(claimEventArgs?.amount).to.equal(BigInt(1000000000000000000));
    expect(claimEventArgs?.account).to.equal(await user1.getAddress());

    const balance = await token.balanceOf(await user1.getAddress());
    expect(balance).to.equal(BigInt(1000000000000000000));

    const isClaimed = await airdrop.claimed(await user1.getAddress());
    expect(isClaimed).to.be.true;

    // Verify disclosed attributes from lastOutput
    expect(lastOutput.issuingState).to.equal("FRA");
    expect(lastOutput.idNumber).to.equal("15AA81234");
    expect(lastOutput.nationality).to.equal("FRA");
    expect(lastOutput.dateOfBirth).to.equal("31-01-94");
    expect(lastOutput.gender).to.equal("M");
    expect(lastOutput.expiryDate).to.equal("31-10-40");
    expect(lastOutput.olderThan).to.equal(20n);
  });
});
