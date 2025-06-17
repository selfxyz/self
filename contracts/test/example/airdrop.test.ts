import { expect } from "chai";
import { deploySystemFixtures } from "../utils/deployment";
import { DeployedActors } from "../utils/types";
import { ethers } from "hardhat";
import { CIRCUIT_CONSTANTS } from "@selfxyz/common/constants/constants";
import { ATTESTATION_ID } from "../utils/constants";
import { generateVcAndDiscloseProof } from "../utils/generateProof.js";
import { poseidon2 } from "poseidon-lite";
import { generateCommitment } from "@selfxyz/common/utils/passports/passport";
import { generateRandomFieldElement, splitHexFromBack } from "../utils/utils";
import BalanceTree from "../utils/example/balance-tree";
import { castFromScope } from "@selfxyz/common/utils/circuits/uuid";
import { formatCountriesList, reverseBytes } from "@selfxyz/common/utils/circuits/formatInputs";
import { Formatter } from "../utils/formatter";
import { hashEndpointWithScope } from "@selfxyz/common/utils/scope";

describe("Airdrop", () => {
  let deployedActors: DeployedActors;
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

  before(async () => {
    deployedActors = await deploySystemFixtures();
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

    baseVcAndDiscloseProof = await generateVcAndDiscloseProof(
      registerSecret,
      BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
      deployedActors.mockPassport,
      hashEndpointWithScope("https://test.com", "test-scope"),
      new Array(88).fill("1"),
      "1",
      imt,
      "20",
      undefined,
      undefined,
      undefined,
      undefined,
      forbiddenCountriesList,
      (await deployedActors.user1.getAddress()).slice(2),
    );

    const tokenFactory = await ethers.getContractFactory("AirdropToken");
    token = await tokenFactory.connect(deployedActors.owner).deploy();
    await token.waitForDeployment();

    await deployedActors.registry
      .connect(deployedActors.owner)
      .devAddIdentityCommitment(ATTESTATION_ID.E_PASSPORT, nullifier, commitment);

    countriesListPacked = splitHexFromBack(
      reverseBytes(Formatter.bytesToHexString(new Uint8Array(formatCountriesList(forbiddenCountriesList)))),
    );

    const airdropFactory = await ethers.getContractFactory("Airdrop");
    airdrop = await airdropFactory.connect(deployedActors.owner).deploy(
      deployedActors.hub.target,
      hashEndpointWithScope("https://test.com", "test-scope"),
      0, // the types show we need a contract version here
      attestationIds,
      token.target,
    );
    await airdrop.waitForDeployment();

    const verificationConfig = {
      olderThanEnabled: true,
      olderThan: 20,
      forbiddenCountriesEnabled: true,
      forbiddenCountriesListPacked: countriesListPacked,
      ofacEnabled: [true, true, true] as [boolean, boolean, boolean],
    };
    await airdrop.connect(deployedActors.owner).setVerificationConfig(verificationConfig);

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
    const tx = await airdrop.connect(user1).verifySelfProof(vcAndDiscloseProof);
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

    const nullifierToId = await airdrop.getNullifier(appNullifier);
    expect(nullifierToId).to.be.equal(await user1.getAddress());

    const isRegistered = await airdrop.isRegistered(await user1.getAddress());
    expect(isRegistered).to.be.equal(true);
    const isRegisteredFalse = await airdrop.isRegistered(await owner.getAddress());
  });

  it("should not able to register address by user if registration is closed", async () => {
    const { owner, user1 } = deployedActors;

    await airdrop.connect(owner).closeRegistration();
    await expect(airdrop.connect(user1).verifySelfProof(vcAndDiscloseProof)).to.be.revertedWithCustomError(
      airdrop,
      "RegistrationNotOpen",
    );
  });

  it("should not able to register address by user if scope is invalid", async () => {
    const { owner, user1 } = deployedActors;

    vcAndDiscloseProof = await generateVcAndDiscloseProof(
      registerSecret,
      BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
      deployedActors.mockPassport,
      hashEndpointWithScope("https://test.com", "test-scope-invalid"),
      new Array(88).fill("1"),
      "1",
      imt,
      "20",
      undefined,
      undefined,
      undefined,
      undefined,
      forbiddenCountriesList,
      (await deployedActors.user1.getAddress()).slice(2),
    );

    await airdrop.connect(owner).openRegistration();
    await expect(airdrop.connect(user1).verifySelfProof(vcAndDiscloseProof)).to.be.revertedWithCustomError(
      airdrop,
      "InvalidScope",
    );
  });

  it("should not able to register address by user if nullifier is already registered", async () => {
    const { owner, user1 } = deployedActors;

    await airdrop.connect(owner).openRegistration();
    await airdrop.connect(user1).verifySelfProof(vcAndDiscloseProof);
    await expect(airdrop.connect(user1).verifySelfProof(vcAndDiscloseProof)).to.be.revertedWithCustomError(
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

    vcAndDiscloseProof = await generateVcAndDiscloseProof(
      registerSecret,
      BigInt(ATTESTATION_ID.INVALID_ATTESTATION_ID).toString(),
      deployedActors.mockPassport,
      hashEndpointWithScope("https://test.com", "test-scope"),
      new Array(88).fill("1"),
      "1",
      invalidImt,
      "20",
      undefined,
      undefined,
      undefined,
      undefined,
      forbiddenCountriesList,
      (await deployedActors.user1.getAddress()).slice(2),
    );

    await airdrop.connect(owner).openRegistration();
    await expect(airdrop.connect(user1).verifySelfProof(vcAndDiscloseProof)).to.be.revertedWithCustomError(
      airdrop,
      "InvalidAttestationId",
    );
  });

  it("should revert with InvalidUserIdentifier when user identifier is 0", async () => {
    const { owner, user1 } = deployedActors;

    vcAndDiscloseProof = await generateVcAndDiscloseProof(
      registerSecret,
      BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
      deployedActors.mockPassport,
      hashEndpointWithScope("https://test.com", "test-scope"),
      new Array(88).fill("1"),
      "1",
      imt,
      "20",
      undefined,
      undefined,
      undefined,
      undefined,
      forbiddenCountriesList,
      "0000000000000000000000000000000000000000",
    );

    await airdrop.connect(owner).openRegistration();
    await expect(airdrop.connect(user1).verifySelfProof(vcAndDiscloseProof)).to.be.revertedWithCustomError(
      airdrop,
      "InvalidUserIdentifier",
    );
  });

  it("should allow registration when targetRootTimestamp is 0", async () => {
    const { hub, registry, owner, user1 } = deployedActors;

    const airdropFactory = await ethers.getContractFactory("Airdrop");
    const newAirdrop = await airdropFactory
      .connect(owner)
      .deploy(hub.target, hashEndpointWithScope("https://test.com", "test-scope"), 0, attestationIds, token.target);
    await newAirdrop.waitForDeployment();

    const verificationConfig = {
      olderThanEnabled: true,
      olderThan: 20,
      forbiddenCountriesEnabled: true,
      forbiddenCountriesListPacked: countriesListPacked,
      ofacEnabled: [true, true, true] as [boolean, boolean, boolean],
    };
    await newAirdrop.connect(owner).setVerificationConfig(verificationConfig);

    await newAirdrop.connect(owner).openRegistration();
    await expect(newAirdrop.connect(user1).verifySelfProof(vcAndDiscloseProof)).to.not.be.reverted;
  });

  it("should return correct scope", async () => {
    const scope = await airdrop.getScope();
    expect(scope).to.equal(hashEndpointWithScope("https://test.com", "test-scope"));
  });

  it("should check if attestation ID is allowed", async () => {
    const isAllowed = await airdrop.isAttestationIdAllowed(ATTESTATION_ID.E_PASSPORT);
    expect(isAllowed).to.be.true;

    const isNotAllowed = await airdrop.isAttestationIdAllowed(999999); // Some random ID not in the list
    expect(isNotAllowed).to.be.false;
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
    await airdrop.connect(user1).verifySelfProof(vcAndDiscloseProof);
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
    await airdrop.connect(user1).verifySelfProof(vcAndDiscloseProof);

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
    await airdrop.connect(user1).verifySelfProof(vcAndDiscloseProof);
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
    await airdrop.connect(user1).verifySelfProof(vcAndDiscloseProof);
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
    await airdrop.connect(user1).verifySelfProof(vcAndDiscloseProof);
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
    await airdrop.connect(user1).verifySelfProof(vcAndDiscloseProof);
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

  it("should able to set verification config by owner", async () => {
    const { owner } = deployedActors;
    const newVerificationConfig = {
      olderThanEnabled: false,
      olderThan: 25,
      forbiddenCountriesEnabled: false,
      forbiddenCountriesListPacked: countriesListPacked,
      ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
    };

    await airdrop.connect(owner).setVerificationConfig(newVerificationConfig);
    const storedConfig = await airdrop.getVerificationConfig();

    expect(storedConfig.olderThanEnabled).to.equal(newVerificationConfig.olderThanEnabled);
    expect(storedConfig.olderThan).to.equal(newVerificationConfig.olderThan);
    expect(storedConfig.forbiddenCountriesEnabled).to.equal(newVerificationConfig.forbiddenCountriesEnabled);
    for (let i = 0; i < 4; i++) {
      expect(storedConfig.forbiddenCountriesListPacked[i]).to.equal(
        newVerificationConfig.forbiddenCountriesListPacked[i],
      );
    }
    expect(storedConfig.ofacEnabled).to.deep.equal(newVerificationConfig.ofacEnabled);
  });

  it("should not able to set verification config by non-owner", async () => {
    const { user1 } = deployedActors;
    const newVerificationConfig = {
      olderThanEnabled: false,
      olderThan: 25,
      forbiddenCountriesEnabled: false,
      forbiddenCountriesListPacked: countriesListPacked,
      ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
    };

    await expect(airdrop.connect(user1).setVerificationConfig(newVerificationConfig))
      .to.be.revertedWithCustomError(airdrop, "OwnableUnauthorizedAccount")
      .withArgs(await user1.getAddress());
  });

  it("should return correct verification config", async () => {
    const config = await airdrop.getVerificationConfig();
    expect(config.olderThanEnabled).to.equal(true);
    expect(config.olderThan).to.equal(20);
    expect(config.forbiddenCountriesEnabled).to.equal(true);
    for (let i = 0; i < 4; i++) {
      expect(config.forbiddenCountriesListPacked[i]).to.equal(countriesListPacked[i]);
    }
    expect(config.ofacEnabled).to.deep.equal([true, true, true]);
  });

  it("should able to update scope by owner", async () => {
    const { owner } = deployedActors;
    const newScope = hashEndpointWithScope("https://newtest.com", "new-test-scope");

    await airdrop.connect(owner).setScope(newScope);
    const scope = await airdrop.getScope();
    expect(scope).to.equal(newScope);

    // Verify event was emitted
    const filter = airdrop.filters.ScopeUpdated();
    const events = await airdrop.queryFilter(filter);
    const lastEvent = events[events.length - 1];
    expect(lastEvent.args.newScope).to.equal(newScope);
  });

  it("should not be able to update scope by non-owner", async () => {
    const { user1 } = deployedActors;
    const newScope = hashEndpointWithScope("https://newtest.com", "new-test-scope");

    await expect(airdrop.connect(user1).setScope(newScope))
      .to.be.revertedWithCustomError(airdrop, "OwnableUnauthorizedAccount")
      .withArgs(await user1.getAddress());
  });

  it("should able to add attestation ID by owner", async () => {
    const { owner } = deployedActors;
    const newAttestationId = 999; // Some new ID

    await airdrop.connect(owner).addAttestationId(newAttestationId);
    const isAllowed = await airdrop.isAttestationIdAllowed(newAttestationId);
    expect(isAllowed).to.be.true;

    // Verify event was emitted
    const filter = airdrop.filters.AttestationIdAdded();
    const events = await airdrop.queryFilter(filter);
    const lastEvent = events[events.length - 1];
    expect(lastEvent.args.attestationId).to.equal(newAttestationId);
  });

  it("should not be able to add attestation ID by non-owner", async () => {
    const { user1 } = deployedActors;
    const newAttestationId = 888; // Some new ID

    await expect(airdrop.connect(user1).addAttestationId(newAttestationId))
      .to.be.revertedWithCustomError(airdrop, "OwnableUnauthorizedAccount")
      .withArgs(await user1.getAddress());
  });

  it("should able to remove attestation ID by owner", async () => {
    const { owner } = deployedActors;
    const attestationIdToRemove = ATTESTATION_ID.E_PASSPORT;

    await airdrop.connect(owner).removeAttestationId(attestationIdToRemove);
    const isAllowed = await airdrop.isAttestationIdAllowed(attestationIdToRemove);
    expect(isAllowed).to.be.false;

    // Verify event was emitted
    const filter = airdrop.filters.AttestationIdRemoved();
    const events = await airdrop.queryFilter(filter);
    const lastEvent = events[events.length - 1];
    expect(lastEvent.args.attestationId).to.equal(attestationIdToRemove);
  });

  it("should not be able to remove attestation ID by non-owner", async () => {
    const { user1 } = deployedActors;
    const attestationIdToRemove = ATTESTATION_ID.E_PASSPORT;

    await expect(airdrop.connect(user1).removeAttestationId(attestationIdToRemove))
      .to.be.revertedWithCustomError(airdrop, "OwnableUnauthorizedAccount")
      .withArgs(await user1.getAddress());
  });
});
