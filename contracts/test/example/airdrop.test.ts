import { expect } from "chai";
import { deploySystemFixturesV2 } from "../utils/deploymentV2";
import { DeployedActorsV2 } from "../utils/types";
import { ethers } from "hardhat";
import { CIRCUIT_CONSTANTS } from "@selfxyz/common/constants/constants";
import { ATTESTATION_ID } from "../utils/constants";
import { generateVcAndDiscloseProof } from "../utils/generateProof";
import { poseidon2 } from "poseidon-lite";
import { generateCommitment } from "@selfxyz/common/utils/passports/passport";
import { generateRandomFieldElement, splitHexFromBack } from "../utils/utils";
import BalanceTree from "../utils/example/balance-tree";
import { formatCountriesList, reverseBytes } from "@selfxyz/common/utils/circuits/formatInputs";
import { Formatter } from "../utils/formatter";
import { hashEndpointWithScope } from "@selfxyz/common/utils/scope";
import { createHash } from "crypto";

// Helper function to calculate user identifier hash
function calculateUserIdentifierHash(userContextData: string): string {
  const sha256Hash = createHash("sha256")
    .update(Buffer.from(userContextData.slice(2), "hex"))
    .digest();
  const ripemdHash = createHash("ripemd160").update(sha256Hash).digest();
  return "0x" + ripemdHash.toString("hex").padStart(40, "0");
}

// Helper function to create V2 proof format
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

describe("Airdrop", () => {
  let deployedActors: DeployedActorsV2;
  let snapshotId: string;
  let airdrop: any;
  let token: any;
  let baseVcAndDiscloseProof: any;
  let vcAndDiscloseProof: any;
  let registerSecret: any;
  let imt: any;
  let commitment: any;
  let nullifier: any;
  let forbiddenCountriesList: any;
  let countriesListPacked: any;
  let attestationIds: any[];
  let userIdentifierBigInt: bigint;
  let numericScope: string;

  before(async () => {
    deployedActors = await deploySystemFixturesV2();
    // must be imported dynamic since @openpassport/zk-kit-lean-imt is exclusively esm and hardhat does not support esm with typescript until verison 3
    const LeanIMT = await import("@openpassport/zk-kit-lean-imt").then((mod) => mod.LeanIMT);
    registerSecret = generateRandomFieldElement();
    nullifier = generateRandomFieldElement();
    attestationIds = [BigInt(ATTESTATION_ID.E_PASSPORT)];
    commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, deployedActors.mockPassport);

    forbiddenCountriesList = ["AAA", "ABC", "CBA"];

    const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
    imt = new LeanIMT<bigint>(hashFunction);
    await imt.insert(BigInt(commitment));

    // Proof generation will happen after airdrop deployment

    const tokenFactory = await ethers.getContractFactory("AirdropToken");
    token = await tokenFactory.connect(deployedActors.owner).deploy();
    await token.waitForDeployment();

    await deployedActors.registry
      .connect(deployedActors.owner)
      .devAddIdentityCommitment(ATTESTATION_ID.E_PASSPORT, nullifier, commitment);

    countriesListPacked = splitHexFromBack(
      reverseBytes(Formatter.bytesToHexString(new Uint8Array(formatCountriesList(forbiddenCountriesList)))),
    );

    // Deploy PoseidonT3 contract for proper scope calculation
    const PoseidonT3Factory = await ethers.getContractFactory("PoseidonT3");
    const poseidonT3 = await PoseidonT3Factory.deploy();
    await poseidonT3.waitForDeployment();
    const poseidonT3Address = await poseidonT3.getAddress();

    // Deploy TestAirdrop contract (which allows setting PoseidonT3 address)
    const airdropFactory = await ethers.getContractFactory("TestAirdrop");
    airdrop = await airdropFactory
      .connect(deployedActors.owner)
      .deploy(deployedActors.hub.target, "test-scope", token.target);
    await airdrop.waitForDeployment();

    // Set the proper scope using the deployed PoseidonT3
    await airdrop.testGenerateScope(poseidonT3Address, "test-scope");

    // Get the actual scope from the airdrop contract (now properly calculated)
    const contractScope = await airdrop.scope();
    numericScope = contractScope.toString();

    const airdropAddress = await airdrop.getAddress();

    console.log(`🏠 TestAirdrop deployed at: ${airdropAddress}`);
    console.log(`🔢 PoseidonT3 deployed at: ${poseidonT3Address}`);
    console.log(`✅ Proper scope (calculated with PoseidonT3): ${numericScope}`);

    // The airdrop now uses the proper calculated scope

    // Calculate the proper user identifier
    const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
    const user1Address = await deployedActors.user1.getAddress();
    const userData = ethers.toUtf8Bytes("airdrop-user-data");

    const tempUserContextData = ethers.solidityPacked(
      ["bytes32", "bytes32", "bytes"],
      [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
    );

    const userIdentifierHash = calculateUserIdentifierHash(tempUserContextData);
    userIdentifierBigInt = BigInt(userIdentifierHash);

    baseVcAndDiscloseProof = await generateVcAndDiscloseProof(
      registerSecret,
      BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
      deployedActors.mockPassport,
      numericScope,
      new Array(88).fill("1"),
      "1",
      imt,
      "20",
      undefined,
      undefined,
      undefined,
      undefined,
      forbiddenCountriesList,
      "0x" + userIdentifierBigInt.toString(16).padStart(64, "0"),
    );

    vcAndDiscloseProof = baseVcAndDiscloseProof;

    // Set up verification config in the hub
    const verificationConfigV2 = {
      olderThanEnabled: true,
      olderThan: "20",
      forbiddenCountriesEnabled: true,
      forbiddenCountriesListPacked: countriesListPacked as [any, any, any, any],
      ofacEnabled: [true, true, true] as [boolean, boolean, boolean],
    };

    // Register the config in the hub and get the config ID
    const configId = await deployedActors.hub
      .connect(deployedActors.owner)
      .setVerificationConfigV2(verificationConfigV2);
    const receipt = await configId.wait();

    // Extract the actual config ID from the transaction receipt
    const actualConfigId = receipt!.logs[0].topics[1]; // The configId is the first indexed parameter

    // Set the config ID in the airdrop contract
    await airdrop.connect(deployedActors.owner).setConfigId(actualConfigId);

    const mintAmount = ethers.parseEther("424242424242");
    await token.mint(airdrop.target, mintAmount);

    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  beforeEach(async () => {
    vcAndDiscloseProof = structuredClone(baseVcAndDiscloseProof);
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
      (log: any) => log.topics[0] === airdrop.interface.getEvent("RegistrationOpen").topicHash,
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
    const { owner } = deployedActors;
    await airdrop.connect(owner).openRegistration();
    const tx = await airdrop.connect(owner).closeRegistration();
    const receipt = await tx.wait();
    const event = receipt?.logs.find(
      (log: any) => log.topics[0] === airdrop.interface.getEvent("RegistrationClose").topicHash,
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
    const { owner } = deployedActors;
    const tx = await airdrop.connect(owner).openClaim();
    const receipt = await tx.wait();

    const event = receipt?.logs.find((log: any) => log.topics[0] === airdrop.interface.getEvent("ClaimOpen").topicHash);
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
      (log: any) => log.topics[0] === airdrop.interface.getEvent("ClaimClose").topicHash,
    );
    expect(event).to.not.be.null;
    expect(await airdrop.isClaimOpen()).to.be.false;
  });

  it("should not able to close claim by owner", async () => {
    const { owner, user1 } = deployedActors;
    await airdrop.connect(owner).openClaim();
    await expect(airdrop.connect(user1).closeClaim()).to.be.revertedWithCustomError(
      airdrop,
      "OwnableUnauthorizedAccount",
    );
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
    const { owner, user1 } = deployedActors;

    await airdrop.connect(owner).openRegistration();

    // Create V2 proof format
    const { proofData, userContextData } = createV2ProofData(vcAndDiscloseProof, await user1.getAddress());

    const tx = await airdrop.connect(user1).verifySelfProof(proofData, userContextData);
    const receipt = await tx.wait();

    const event = receipt?.logs.find(
      (log: any) => log.topics[0] === airdrop.interface.getEvent("UserIdentifierRegistered").topicHash,
    );
    const eventArgs = event
      ? airdrop.interface.decodeEventLog("UserIdentifierRegistered", event.data, event.topics)
      : null;

    expect(eventArgs?.registeredUserIdentifier).to.be.equal(await user1.getAddress());

    const appNullifier = vcAndDiscloseProof.pubSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_NULLIFIER_INDEX];
    expect(eventArgs?.nullifier).to.be.equal(appNullifier);
  });

  it("should not able to register address by user if registration is closed", async () => {
    const { owner, user1 } = deployedActors;

    await airdrop.connect(owner).closeRegistration();

    // Create V2 proof format
    const { proofData, userContextData } = createV2ProofData(vcAndDiscloseProof, await user1.getAddress());

    await expect(airdrop.connect(user1).verifySelfProof(proofData, userContextData)).to.be.revertedWithCustomError(
      airdrop,
      "RegistrationNotOpen",
    );
  });

  it("should not able to register address by user if scope is invalid", async () => {
    const { owner, user1 } = deployedActors;

    // Now that we have proper scope calculation, we can create a proof with a genuinely different scope
    const airdropAddress = await airdrop.getAddress();
    const differentScope = hashEndpointWithScope(airdropAddress.toLowerCase(), "different-test-scope");

    console.log(`TestAirdrop scope: ${numericScope}`);
    console.log(`Different scope for test: ${differentScope}`);

    // Generate proof with the different scope
    const invalidVcAndDiscloseProof = await generateVcAndDiscloseProof(
      registerSecret,
      BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
      deployedActors.mockPassport,
      differentScope, // Use different scope
      new Array(88).fill("1"),
      "1",
      imt,
      "20",
      undefined,
      undefined,
      undefined,
      undefined,
      forbiddenCountriesList,
      "0x" + userIdentifierBigInt.toString(16).padStart(64, "0"),
    );

    await airdrop.connect(owner).openRegistration();

    // Create V2 proof format with invalid proof (different scope)
    const { proofData, userContextData } = createV2ProofData(invalidVcAndDiscloseProof, await user1.getAddress());

    await expect(airdrop.connect(user1).verifySelfProof(proofData, userContextData)).to.be.revertedWithCustomError(
      deployedActors.hub,
      "ScopeMismatch",
    );
  });

  it("should not able to register address by user if nullifier is already registered", async () => {
    const { owner, user1 } = deployedActors;

    await airdrop.connect(owner).openRegistration();

    // Create V2 proof format
    const { proofData, userContextData } = createV2ProofData(vcAndDiscloseProof, await user1.getAddress());

    // First registration should succeed
    await airdrop.connect(user1).verifySelfProof(proofData, userContextData);

    // Second registration with same nullifier should fail
    await expect(airdrop.connect(user1).verifySelfProof(proofData, userContextData)).to.be.revertedWithCustomError(
      airdrop,
      "RegisteredNullifier",
    );
  });

  it("should not able to register address by user if attestation id is invalid", async () => {
    const { registry, owner, user1 } = deployedActors;

    const invalidCommitment = generateCommitment(
      registerSecret,
      ATTESTATION_ID.INVALID_ATTESTATION_ID,
      deployedActors.mockPassport,
    );

    await registry
      .connect(owner)
      .devAddIdentityCommitment(ATTESTATION_ID.INVALID_ATTESTATION_ID, nullifier, invalidCommitment);

    const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
    // must be imported dynamic since @openpassport/zk-kit-lean-imt is exclusively esm and hardhat does not support esm with typescript until verison 3
    const LeanIMT = await import("@openpassport/zk-kit-lean-imt").then((mod) => mod.LeanIMT);
    const invalidImt = new LeanIMT<bigint>(hashFunction);
    await invalidImt.insert(BigInt(commitment));
    await invalidImt.insert(BigInt(invalidCommitment));

    const invalidVcAndDiscloseProof = await generateVcAndDiscloseProof(
      registerSecret,
      BigInt(ATTESTATION_ID.INVALID_ATTESTATION_ID).toString(),
      deployedActors.mockPassport,
      numericScope, // Use the same scope as airdrop (proper calculated scope)
      new Array(88).fill("1"),
      "1",
      invalidImt,
      "20",
      undefined,
      undefined,
      undefined,
      undefined,
      forbiddenCountriesList,
      "0x" + userIdentifierBigInt.toString(16).padStart(64, "0"),
    );

    await airdrop.connect(owner).openRegistration();

    // Create V2 proof format with invalid attestation ID
    const { proofData, userContextData } = createV2ProofData(invalidVcAndDiscloseProof, await user1.getAddress());

    await expect(airdrop.connect(user1).verifySelfProof(proofData, userContextData)).to.be.revertedWithCustomError(
      deployedActors.hub,
      "AttestationIdMismatch",
    );
  });

  it("should revert with InvalidUserIdentifier when user identifier is 0", async () => {
    const { owner, user1 } = deployedActors;

    // Generate proof with zero user identifier
    const invalidVcAndDiscloseProof = await generateVcAndDiscloseProof(
      registerSecret,
      BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
      deployedActors.mockPassport,
      numericScope, // Use the same scope as airdrop (proper calculated scope)
      new Array(88).fill("1"),
      "1",
      imt,
      "20",
      undefined,
      undefined,
      undefined,
      undefined,
      forbiddenCountriesList,
      "0x0000000000000000000000000000000000000000000000000000000000000000", // Zero user identifier
    );

    await airdrop.connect(owner).openRegistration();

    // Create V2 proof format with zero user identifier proof
    const { proofData, userContextData } = createV2ProofData(invalidVcAndDiscloseProof, await user1.getAddress());

    await expect(airdrop.connect(user1).verifySelfProof(proofData, userContextData)).to.be.revertedWithCustomError(
      deployedActors.hub,
      "InvalidUserIdentifierInProof",
    );
  });

  it("should allow registration when targetRootTimestamp is 0", async () => {
    const { hub, registry, owner, user1 } = deployedActors;

    // Deploy a new TestAirdrop with different scopeSeed
    const PoseidonT3Factory = await ethers.getContractFactory("PoseidonT3");
    const newPoseidonT3 = await PoseidonT3Factory.deploy();
    await newPoseidonT3.waitForDeployment();
    const newPoseidonT3Address = await newPoseidonT3.getAddress();

    const airdropFactory = await ethers.getContractFactory("TestAirdrop");
    const newAirdrop = await airdropFactory.connect(owner).deploy(hub.target, "test-scope-2", token.target);
    await newAirdrop.waitForDeployment();

    // Set the proper scope for the new airdrop using the deployed PoseidonT3
    await newAirdrop.testGenerateScope(newPoseidonT3Address, "test-scope-2");

    // Set up verification config for the new airdrop (same as main airdrop)
    const verificationConfigV2 = {
      olderThanEnabled: true,
      olderThan: "20",
      forbiddenCountriesEnabled: true,
      forbiddenCountriesListPacked: countriesListPacked as [any, any, any, any],
      ofacEnabled: [true, true, true] as [boolean, boolean, boolean],
    };

    // Register the config in the hub and get the config ID
    const configTx = await deployedActors.hub.connect(owner).setVerificationConfigV2(verificationConfigV2);
    const configReceipt = await configTx.wait();

    // Extract the actual config ID from the transaction receipt
    const actualConfigId = configReceipt!.logs[0].topics[1]; // The configId is the first indexed parameter

    // Set the config ID in the new airdrop contract
    await newAirdrop.connect(owner).setConfigId(actualConfigId);

    await newAirdrop.connect(owner).openRegistration();

    // Get the actual scope from the new airdrop contract
    const newAirdropScope = await newAirdrop.scope();
    const newAirdropScopeAsBigIntString = newAirdropScope.toString();

    // Calculate user identifier for the new airdrop context
    const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
    const user1Address = await user1.getAddress();
    const userData = ethers.toUtf8Bytes("airdrop-user-data");

    const tempUserContextData = ethers.solidityPacked(
      ["bytes32", "bytes32", "bytes"],
      [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
    );

    const userIdentifierHash = calculateUserIdentifierHash(tempUserContextData);
    const newUserIdentifierBigInt = BigInt(userIdentifierHash);

    // Generate proof with the new airdrop's scope
    const newVcAndDiscloseProof = await generateVcAndDiscloseProof(
      registerSecret,
      BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
      deployedActors.mockPassport,
      newAirdropScopeAsBigIntString, // Use the actual scope from the new contract
      new Array(88).fill("1"),
      "1",
      imt,
      "20",
      undefined,
      undefined,
      undefined,
      undefined,
      forbiddenCountriesList,
      "0x" + newUserIdentifierBigInt.toString(16).padStart(64, "0"), // Use proper user identifier
    );

    // Create V2 proof format for the new airdrop
    const { proofData, userContextData } = createV2ProofData(newVcAndDiscloseProof, await user1.getAddress());

    await expect(newAirdrop.connect(user1).verifySelfProof(proofData, userContextData)).to.not.be.reverted;
  });

  it("should return correct scope", async () => {
    const scope = await airdrop.scope();

    // With TestAirdrop and deployed PoseidonT3, we now get the proper calculated scope
    expect(scope).to.not.equal(0n);

    // Verify that our test setup correctly uses the contract's actual scope
    expect(numericScope).to.equal(scope.toString());

    // Calculate what the scope would be using hashEndpointWithScope for comparison
    const airdropAddress = await airdrop.getAddress();
    const expectedScope = hashEndpointWithScope(airdropAddress.toLowerCase(), "test-scope");

    // The contract-calculated scope should match the expected scope
    expect(scope.toString()).to.equal(expectedScope);

    // Also compare with TestSelfVerificationRoot which should have the same scope calculation method
    const testRootScope = await deployedActors.testSelfVerificationRoot.scope();
    expect(testRootScope).to.not.equal(0n);

    console.log(`✅ TestAirdrop scope (with PoseidonT3): ${scope}`);
    console.log(`✅ Test scope variable: ${numericScope}`);
    console.log(`🔍 TestSelfVerificationRoot scope: ${testRootScope}`);
    console.log(`🌐 Expected scope (hashEndpointWithScope): ${expectedScope}`);
    console.log(`🎯 All scopes match: ${scope.toString() === expectedScope}`);
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
    const { owner, user1 } = deployedActors;

    await airdrop.connect(owner).openRegistration();

    // Register the user first using V2 interface
    const { proofData, userContextData } = createV2ProofData(vcAndDiscloseProof, await user1.getAddress());
    await airdrop.connect(user1).verifySelfProof(proofData, userContextData);

    await airdrop.connect(owner).closeRegistration();

    const tree = new BalanceTree([{ account: await user1.getAddress(), amount: BigInt(1000000000000000000) }]);
    const root = tree.getHexRoot();

    await airdrop.connect(owner).setMerkleRoot(root);

    await airdrop.connect(owner).openClaim();
    const merkleProof = tree.getProof(0, await user1.getAddress(), BigInt(1000000000000000000));
    const tx = await airdrop.connect(user1).claim(0, BigInt(1000000000000000000), merkleProof);
    const receipt = await tx.wait();

    const event = receipt?.logs.find((log: any) => log.topics[0] === airdrop.interface.getEvent("Claimed").topicHash);
    const eventArgs = event ? airdrop.interface.decodeEventLog("Claimed", event.data, event.topics) : null;

    expect(eventArgs?.index).to.equal(0);
    expect(eventArgs?.amount).to.equal(BigInt(1000000000000000000));
    expect(eventArgs?.account).to.equal(await user1.getAddress());

    const balance = await token.balanceOf(await user1.getAddress());
    expect(balance).to.equal(BigInt(1000000000000000000));

    const isClaimed = await airdrop.claimed(await user1.getAddress());
    expect(isClaimed).to.be.true;
  });

  it("should not able to claim token by user if registration is not closed", async () => {
    const { owner, user1 } = deployedActors;

    await airdrop.connect(owner).openRegistration();

    // Register the user first using V2 interface
    const { proofData, userContextData } = createV2ProofData(vcAndDiscloseProof, await user1.getAddress());
    await airdrop.connect(user1).verifySelfProof(proofData, userContextData);

    const tree = new BalanceTree([{ account: await user1.getAddress(), amount: BigInt(1000000000000000000) }]);
    const root = tree.getHexRoot();

    await airdrop.connect(owner).setMerkleRoot(root);

    await airdrop.connect(owner).openClaim();
    const merkleProof = tree.getProof(0, await user1.getAddress(), BigInt(1000000000000000000));
    await expect(
      airdrop.connect(user1).claim(0, BigInt(1000000000000000000), merkleProof),
    ).to.be.revertedWithCustomError(airdrop, "RegistrationNotClosed");

    const isClaimed = await airdrop.claimed(await user1.getAddress());
    expect(isClaimed).to.be.false;
  });

  it("should not able to claim token by user if claim is not open", async () => {
    const { owner, user1 } = deployedActors;

    await airdrop.connect(owner).openRegistration();

    // Register the user first using V2 interface
    const { proofData, userContextData } = createV2ProofData(vcAndDiscloseProof, await user1.getAddress());
    await airdrop.connect(user1).verifySelfProof(proofData, userContextData);

    await airdrop.connect(owner).closeRegistration();

    const tree = new BalanceTree([{ account: await user1.getAddress(), amount: BigInt(1000000000000000000) }]);
    const root = tree.getHexRoot();

    await airdrop.connect(owner).setMerkleRoot(root);

    const merkleProof = tree.getProof(0, await user1.getAddress(), BigInt(1000000000000000000));
    await expect(
      airdrop.connect(user1).claim(0, BigInt(1000000000000000000), merkleProof),
    ).to.be.revertedWithCustomError(airdrop, "ClaimNotOpen");

    const isClaimed = await airdrop.claimed(await user1.getAddress());
    expect(isClaimed).to.be.false;
  });

  it("should not able to claim token by user if user has already claimed", async () => {
    const { owner, user1 } = deployedActors;

    await airdrop.connect(owner).openRegistration();

    // Register the user first using V2 interface
    const { proofData, userContextData } = createV2ProofData(vcAndDiscloseProof, await user1.getAddress());
    await airdrop.connect(user1).verifySelfProof(proofData, userContextData);

    await airdrop.connect(owner).closeRegistration();
    const tree = new BalanceTree([{ account: await user1.getAddress(), amount: BigInt(1000000000000000000) }]);
    const root = tree.getHexRoot();

    await airdrop.connect(owner).setMerkleRoot(root);

    await airdrop.connect(owner).openClaim();
    const merkleProof = tree.getProof(0, await user1.getAddress(), BigInt(1000000000000000000));
    await airdrop.connect(user1).claim(0, BigInt(1000000000000000000), merkleProof);
    await expect(
      airdrop.connect(user1).claim(0, BigInt(1000000000000000000), merkleProof),
    ).to.be.revertedWithCustomError(airdrop, "AlreadyClaimed");

    const balance = await token.balanceOf(await user1.getAddress());
    expect(balance).to.equal(BigInt(1000000000000000000));

    const isClaimed = await airdrop.claimed(await user1.getAddress());
    expect(isClaimed).to.be.true;
  });

  it("should not able to claim token by user if merkle proof is invalid", async () => {
    const { owner, user1 } = deployedActors;

    await airdrop.connect(owner).openRegistration();

    // Register the user first using V2 interface
    const { proofData, userContextData } = createV2ProofData(vcAndDiscloseProof, await user1.getAddress());
    await airdrop.connect(user1).verifySelfProof(proofData, userContextData);

    await airdrop.connect(owner).closeRegistration();
    const tree = new BalanceTree([{ account: await user1.getAddress(), amount: BigInt(1000000000000000000) }]);
    const root = tree.getHexRoot();

    await airdrop.connect(owner).setMerkleRoot(root);

    await airdrop.connect(owner).openClaim();
    const merkleProof = tree.getProof(0, await user1.getAddress(), BigInt(1000000000000000000));
    merkleProof[0] = generateRandomFieldElement().toString();
    await expect(
      airdrop.connect(user1).claim(0, BigInt(1000000000000000000), merkleProof),
    ).to.be.revertedWithCustomError(airdrop, "InvalidProof");

    const isClaimed = await airdrop.claimed(await user1.getAddress());
    expect(isClaimed).to.be.false;
  });

  it("should not able to claim token by user if user is not registered", async () => {
    const { owner, user1, user2 } = deployedActors;

    await airdrop.connect(owner).openRegistration();

    // Register only user1, not user2
    const { proofData, userContextData } = createV2ProofData(vcAndDiscloseProof, await user1.getAddress());
    await airdrop.connect(user1).verifySelfProof(proofData, userContextData);

    await airdrop.connect(owner).closeRegistration();

    const tree = new BalanceTree([
      { account: await user1.getAddress(), amount: BigInt(1000000000000000000) },
      { account: await user2.getAddress(), amount: BigInt(1000000000000000000) },
    ]);
    const root = tree.getHexRoot();

    await airdrop.connect(owner).setMerkleRoot(root);
    await airdrop.connect(owner).openClaim();

    const merkleProof = tree.getProof(1, await user2.getAddress(), BigInt(1000000000000000000));
    await expect(airdrop.connect(user2).claim(1, BigInt(1000000000000000000), merkleProof))
      .to.be.revertedWithCustomError(airdrop, "NotRegistered")
      .withArgs(await user2.getAddress());

    const isClaimed = await airdrop.claimed(await user2.getAddress());
    expect(isClaimed).to.be.false;
  });

  it("should able to set config ID by owner", async () => {
    const { owner } = deployedActors;
    const newConfigId = ethers.keccak256(ethers.toUtf8Bytes("new-config-v1"));

    await airdrop.connect(owner).setConfigId(newConfigId);
    const storedConfigId = await airdrop.verificationConfigId();

    expect(storedConfigId).to.equal(newConfigId);
  });

  it("should not able to set config ID by non-owner", async () => {
    const { user1 } = deployedActors;
    const newConfigId = ethers.keccak256(ethers.toUtf8Bytes("new-config-v1"));

    await expect(airdrop.connect(user1).setConfigId(newConfigId))
      .to.be.revertedWithCustomError(airdrop, "OwnableUnauthorizedAccount")
      .withArgs(await user1.getAddress());
  });
});
