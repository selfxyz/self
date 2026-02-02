import { ethers } from "hardhat";
import { deploySystemFixturesV2 } from "../utils/deploymentV2";
import { DeployedActorsV2 } from "../utils/types";
import { KYC_ATTESTATION_ID } from "@selfxyz/common/constants/constants";
import { generateMockKycRegisterInput } from "@selfxyz/common/utils/kyc/generateInputs";
import { generateRegisterKycProof } from "../utils/generateProof";
import { expect } from "chai";

function getCurrentDateDigitsYYMMDDHHMMSS(hoursOffset: number = 0): bigint[] {
  const now = new Date();
  if (hoursOffset !== 0) {
    now.setUTCHours(now.getUTCHours() + hoursOffset);
  }
  const pad2 = (n: number) => n.toString().padStart(2, "0");
  const yy = pad2(now.getUTCFullYear() % 100);
  const mm = pad2(now.getUTCMonth() + 1);
  const dd = pad2(now.getUTCDate());
  const hh = pad2(now.getUTCHours());
  const min = pad2(now.getUTCMinutes());
  const ss = pad2(now.getUTCSeconds());
  return `${yy}${mm}${dd}${hh}${min}${ss}`.split("").map(Number).map(BigInt);
}

/**
 * Packs a uint256 value into field elements as a 64-character hex string.
 * This mirrors how the GCP JWT circuit outputs pubkey commitments.
 */
function packUint256ToHexFields(value: bigint): [bigint, bigint, bigint] {
  const hexStr = value.toString(16).padStart(64, "0");
  const bytes = Buffer.from(hexStr, "utf8");

  let p0 = 0n,
    p1 = 0n,
    p2 = 0n;

  for (let i = 0; i < Math.min(31, bytes.length); i++) {
    p0 |= BigInt(bytes[i]) << BigInt(i * 8);
  }
  for (let i = 31; i < Math.min(62, bytes.length); i++) {
    p1 |= BigInt(bytes[i]) << BigInt((i - 31) * 8);
  }
  for (let i = 62; i < Math.min(93, bytes.length); i++) {
    p2 |= BigInt(bytes[i]) << BigInt((i - 62) * 8);
  }

  return [p0, p1, p2];
}

describe("KYC Registration test", function () {
  this.timeout(0);

  let deployedActors: DeployedActorsV2;
  let snapshotId: string;
  let attestationIdBytes32: string;

  const GCP_ROOT_CA_PUBKEY_HASH = 21107503781769611051785921462832133421817512022858926231578334326320168810501n;

  before(async () => {
    deployedActors = await deploySystemFixturesV2();
    attestationIdBytes32 = ethers.zeroPadValue(ethers.toBeHex(BigInt(KYC_ATTESTATION_ID)), 32);

    // Set the owner as the TEE for all tests
    await deployedActors.registryKyc.updateTEE(await deployedActors.owner.getAddress());

    // Set the GCP root CA pubkey hash
    await deployedActors.registryKyc.updateGCPRootCAPubkeyHash(GCP_ROOT_CA_PUBKEY_HASH);

    console.log("🎉 System deployment and initial setup completed!");
  });

  beforeEach(async () => {
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  describe("Identity Commitment", () => {
    let kycData: any;
    let registerProof: any;
    let registerSecret: string;
    let mockVerifier: any;
    let mockProof: any;
    let mockPubSignals: bigint[];
    let snapshotId: string;

    before(async () => {
      registerSecret = "12345";
      kycData = await generateMockKycRegisterInput(undefined, true, registerSecret);
      registerProof = await generateRegisterKycProof(registerSecret, kycData);

      // Deploy and set mock GCP JWT verifier
      const MockVerifierFactory = await ethers.getContractFactory("MockGCPJWTVerifier");
      mockVerifier = await MockVerifierFactory.deploy();
      await mockVerifier.waitForDeployment();
      await deployedActors.registryKyc.updateGCPJWTVerifier(mockVerifier.target);

      // Get the pubkey commitment from the register proof and pack as hex
      const pubkeyCommitment = registerProof.pubSignals[registerProof.pubSignals.length - 2];
      const [p0, p1, p2] = packUint256ToHexFields(BigInt(pubkeyCommitment));

      // Test image hash that unpacks to: d2221a0ee83901980c607ceff2edbedf3f6ce5f437eafa5d89be39e9e7487c04
      const testImageHash = {
        p0: 177384435506496807268973340845468654286294928521500580044819492874465981028n,
        p1: 175298970718174405520284770870231222447414486446296682893283627688949855078n,
        p2: 13360n,
      };

      // Add the corresponding PCR0 (16 zero bytes + 32 hash bytes)
      const pcr0Bytes = ethers.getBytes(
        "0x" + "d2221a0ee83901980c607ceff2edbedf3f6ce5f437eafa5d89be39e9e7487c04".padStart(32, "0"),
      );
      await deployedActors.pcr0Manager.addPCR0(pcr0Bytes);

      // Register the pubkey commitment via GCP JWT proof
      mockProof = {
        a: [1n, 2n] as [bigint, bigint],
        b: [
          [1n, 2n],
          [3n, 4n],
        ] as [[bigint, bigint], [bigint, bigint]],
        c: [1n, 2n] as [bigint, bigint],
      };

      mockPubSignals = [
        GCP_ROOT_CA_PUBKEY_HASH,
        p0,
        p1,
        p2,
        0n,
        testImageHash.p0,
        testImageHash.p1,
        testImageHash.p2,
        ...getCurrentDateDigitsYYMMDDHHMMSS(),
      ];
      // Take an EVM snapshot before tests to allow reverting in each test for isolation
      // We will use this snapshot in the afterEach for revert, but store it here.
      // Using Mocha "this" context to store snapshotId for this suite.
      snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    afterEach(async () => {
      await ethers.provider.send("evm_revert", [snapshotId]);
      snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    it("should successfully register an identity commitment", async () => {
      await deployedActors.registryKyc.registerPubkeyCommitment(mockProof.a, mockProof.b, mockProof.c, mockPubSignals);

      await expect(deployedActors.hub.registerCommitment(attestationIdBytes32, 0n, registerProof)).to.emit(
        deployedActors.registryKyc,
        "CommitmentRegistered",
      );

      const isRegistered = await deployedActors.registryKyc.nullifiers(registerProof.pubSignals[0]);
      expect(isRegistered).to.be.true;
    });

    it("should throw an error if the pubkey commitment is not registered", async () => {
      await expect(
        deployedActors.hub.registerCommitment(attestationIdBytes32, 0n, registerProof),
      ).to.be.revertedWithCustomError(deployedActors.hub, "InvalidPubkeyCommitment");
    });

    it("should not register an identity commitment if the proof is invalid", async () => {
      await deployedActors.registryKyc.registerPubkeyCommitment(mockProof.a, mockProof.b, mockProof.c, mockPubSignals);

      const invalidRegisterProof = structuredClone(registerProof);
      invalidRegisterProof.pubSignals[1] = 0n;
      await expect(
        deployedActors.hub.registerCommitment(attestationIdBytes32, 0n, invalidRegisterProof),
      ).to.be.revertedWithCustomError(deployedActors.hub, "InvalidRegisterProof");
    });

    it("should fail with NoVerifierSet when using non-existent register verifier ID", async () => {
      await expect(
        deployedActors.hub.registerCommitment(attestationIdBytes32, 999999n, registerProof),
      ).to.be.revertedWithCustomError(deployedActors.hub, "NoVerifierSet");
    });

    it("should fail with NoVerifierSet when attestation ID is invalid", async () => {
      const invalidAttestationId = ethers.zeroPadValue(ethers.toBeHex(999), 32);
      await expect(
        deployedActors.hub.registerCommitment(invalidAttestationId, 0n, registerProof),
      ).to.be.revertedWithCustomError(deployedActors.hub, "NoVerifierSet");
    });

    it("should fail with InvalidAttestationId for mismatched verifier registry", async () => {
      const invalidAttestationId = ethers.zeroPadValue(ethers.toBeHex(999), 32);
      await deployedActors.hub.updateRegisterCircuitVerifier(
        invalidAttestationId,
        1n,
        await deployedActors.registryAadhaar.getAddress(),
      );

      await expect(
        deployedActors.hub.registerCommitment(invalidAttestationId, 1n, registerProof),
      ).to.be.revertedWithCustomError(deployedActors.hub, "InvalidAttestationId");
    });

    it("should fail with InvalidPubkeyCommitment when pubkey commitment is not registered", async () => {
      const newRegisterProof = structuredClone(registerProof);
      newRegisterProof.pubSignals[2] = 0n;

      await expect(
        deployedActors.hub.registerCommitment(attestationIdBytes32, 0n, newRegisterProof),
      ).to.be.revertedWithCustomError(deployedActors.hub, "InvalidPubkeyCommitment");
    });
  });

  describe("GCP JWT Pubkey Registration", () => {
    const mockProof = {
      a: [1n, 2n] as [bigint, bigint],
      b: [
        [1n, 2n],
        [3n, 4n],
      ] as [[bigint, bigint], [bigint, bigint]],
      c: [1n, 2n] as [bigint, bigint],
    };

    it("should have correct GCP root CA pubkey hash", async () => {
      const contractHash = await deployedActors.registryKyc.gcpRootCAPubkeyHash();
      expect(contractHash).to.equal(GCP_ROOT_CA_PUBKEY_HASH);
    });

    it("should allow owner to update GCP root CA pubkey hash", async () => {
      const newHash = 12345n;
      await deployedActors.registryKyc.updateGCPRootCAPubkeyHash(newHash);
      const contractHash = await deployedActors.registryKyc.gcpRootCAPubkeyHash();
      expect(contractHash).to.equal(newHash);
    });

    it("should not allow non-owner to update GCP root CA pubkey hash", async () => {
      await expect(
        deployedActors.registryKyc.connect(deployedActors.user1).updateGCPRootCAPubkeyHash(12345n),
      ).to.be.revertedWithCustomError(deployedActors.registryKyc, "AccessControlUnauthorizedAccount");
    });

    it("should fail with INVALID_IMAGE when image hash not in PCR0Manager", async () => {
      const mockPubSignals: bigint[] = [
        GCP_ROOT_CA_PUBKEY_HASH,
        1n,
        2n,
        3n,
        0n,
        4n,
        5n,
        6n,
        ...getCurrentDateDigitsYYMMDDHHMMSS().map(BigInt),
      ];

      await expect(
        deployedActors.registryKyc.registerPubkeyCommitment(mockProof.a, mockProof.b, mockProof.c, mockPubSignals),
      ).to.be.revertedWithCustomError(deployedActors.registryKyc, "INVALID_IMAGE");
    });

    it("should not allow non-owner to update GCP JWT verifier", async () => {
      await expect(
        deployedActors.registryKyc
          .connect(deployedActors.user1)
          .updateGCPJWTVerifier(ethers.Wallet.createRandom().address),
      ).to.be.revertedWithCustomError(deployedActors.registryKyc, "AccessControlUnauthorizedAccount");
    });

    it("should allow owner to update GCP JWT verifier", async () => {
      const newVerifier = ethers.Wallet.createRandom().address;
      await deployedActors.registryKyc.updateGCPJWTVerifier(newVerifier);
    });

    describe("TEE Access Control", () => {
      it("should not allow non-TEE to register pubkey commitment", async () => {
        const mockPubSignals: bigint[] = [
          GCP_ROOT_CA_PUBKEY_HASH,
          1n,
          2n,
          3n,
          0n,
          4n,
          5n,
          6n,
          ...getCurrentDateDigitsYYMMDDHHMMSS().map(BigInt),
        ];

        await expect(
          deployedActors.registryKyc
            .connect(deployedActors.user1)
            .registerPubkeyCommitment(mockProof.a, mockProof.b, mockProof.c, mockPubSignals),
        ).to.be.revertedWithCustomError(deployedActors.registryKyc, "ONLY_TEE_CAN_ACCESS");
      });

      it("should not allow non-owner to update TEE", async () => {
        await expect(
          deployedActors.registryKyc.connect(deployedActors.user1).updateTEE(ethers.Wallet.createRandom().address),
        ).to.be.revertedWithCustomError(deployedActors.registryKyc, "AccessControlUnauthorizedAccount");
      });

      it("should allow owner to update TEE", async () => {
        const newTee = ethers.Wallet.createRandom().address;
        await deployedActors.registryKyc.updateTEE(newTee);
        expect(await deployedActors.registryKyc.tee()).to.equal(newTee);
      });

      it("should fail with TEE_NOT_SET when TEE address is zero", async () => {
        // Deploy minimal fresh registry to test uninitialized TEE state
        const freshImpl = await (
          await ethers.getContractFactory("IdentityRegistryKycImplV1", {
            libraries: { PoseidonT3: deployedActors.poseidonT3.target },
          })
        ).deploy();

        const initData = freshImpl.interface.encodeFunctionData("initialize", [
          ethers.ZeroAddress,
          deployedActors.pcr0Manager.target,
        ]);
        const freshProxy = await (
          await ethers.getContractFactory("IdentityRegistry")
        ).deploy(freshImpl.target, initData);

        const freshRegistry = await ethers.getContractAt("IdentityRegistryKycImplV1", freshProxy.target);
        await freshRegistry.updateGCPJWTVerifier(deployedActors.gcpJwtVerifier.target);

        const mockPubSignals: bigint[] = [
          GCP_ROOT_CA_PUBKEY_HASH,
          1n,
          2n,
          3n,
          0n,
          4n,
          5n,
          6n,
          ...getCurrentDateDigitsYYMMDDHHMMSS().map(BigInt),
        ];

        await expect(
          freshRegistry.registerPubkeyCommitment(mockProof.a, mockProof.b, mockProof.c, mockPubSignals),
        ).to.be.revertedWithCustomError(freshRegistry, "TEE_NOT_SET");
      });

      it("should fail with INVALID_TIMESTAMP when timestamp is in the past or future", async () => {
        // Add the PCR0 image hash so the image validation passes and we can test timestamp validation
        // addPCR0 takes 32 bytes and pads to 48 bytes internally, isPCR0Set requires 48 bytes
        const pcr0Hash = "d2221a0ee83901980c607ceff2edbedf3f6ce5f437eafa5d89be39e9e7487c04";
        const pcr0Bytes32 = ethers.getBytes("0x" + pcr0Hash);
        const pcr0Bytes48 = ethers.getBytes("0x" + "00".repeat(16) + pcr0Hash);
        // Only add PCR0 if not already set (may have been added by earlier test)
        const isAlreadySet = await deployedActors.pcr0Manager.isPCR0Set(pcr0Bytes48);
        if (!isAlreadySet) {
          await deployedActors.pcr0Manager.addPCR0(pcr0Bytes32);
        }

        let mockPubkeyCommitment = 12345678901234567890123456789012n;
        const [p0, p1, p2] = packUint256ToHexFields(BigInt(mockPubkeyCommitment));

        // Create a timestamp 2 hours in the past (more than 1 hour threshold)
        const previousHourDate = getCurrentDateDigitsYYMMDDHHMMSS(-2);

        const mockPubSignalsPast = [
          GCP_ROOT_CA_PUBKEY_HASH,
          p0,
          p1,
          p2,
          0n,
          177384435506496807268973340845468654286294928521500580044819492874465981028n,
          175298970718174405520284770870231222447414486446296682893283627688949855078n,
          13360n,
          ...previousHourDate,
        ];

        await expect(
          deployedActors.registryKyc.registerPubkeyCommitment(
            mockProof.a,
            mockProof.b,
            mockProof.c,
            mockPubSignalsPast,
          ),
        ).to.be.revertedWithCustomError(deployedActors.registryKyc, "INVALID_TIMESTAMP");

        // Create a timestamp 2 hours in the future (more than 1 hour threshold)
        const nextHourDate = getCurrentDateDigitsYYMMDDHHMMSS(2);

        const mockPubSignalsFuture = [
          GCP_ROOT_CA_PUBKEY_HASH,
          p0,
          p1,
          p2,
          0n,
          177384435506496807268973340845468654286294928521500580044819492874465981028n,
          175298970718174405520284770870231222447414486446296682893283627688949855078n,
          13360n,
          ...nextHourDate,
        ];

        await expect(
          deployedActors.registryKyc.registerPubkeyCommitment(
            mockProof.a,
            mockProof.b,
            mockProof.c,
            mockPubSignalsFuture,
          ),
        ).to.be.revertedWithCustomError(deployedActors.registryKyc, "INVALID_TIMESTAMP");
      });
    });

    describe("with MockGCPJWTVerifier", () => {
      let mockVerifier: any;

      before(async () => {
        const MockVerifierFactory = await ethers.getContractFactory("MockGCPJWTVerifier");
        mockVerifier = await MockVerifierFactory.deploy();
        await mockVerifier.waitForDeployment();
        await deployedActors.registryKyc.updateGCPJWTVerifier(mockVerifier.target);
      });

      afterEach(async () => {
        await mockVerifier.setShouldVerify(true);
      });

      it("should fail with INVALID_PROOF when verifier rejects proof", async () => {
        await mockVerifier.setShouldVerify(false);
        const mockPubSignals: bigint[] = [
          GCP_ROOT_CA_PUBKEY_HASH,
          1n,
          2n,
          3n,
          0n,
          4n,
          5n,
          6n,
          ...getCurrentDateDigitsYYMMDDHHMMSS().map(BigInt),
        ];

        await expect(
          deployedActors.registryKyc.registerPubkeyCommitment(mockProof.a, mockProof.b, mockProof.c, mockPubSignals),
        ).to.be.revertedWithCustomError(deployedActors.registryKyc, "INVALID_PROOF");
      });

      it("should fail with INVALID_ROOT_CA when root CA hash does not match", async () => {
        const mockPubSignals: bigint[] = [
          12345n,
          1n,
          2n,
          3n,
          0n,
          4n,
          5n,
          6n,
          ...getCurrentDateDigitsYYMMDDHHMMSS().map(BigInt),
        ];

        await expect(
          deployedActors.registryKyc.registerPubkeyCommitment(mockProof.a, mockProof.b, mockProof.c, mockPubSignals),
        ).to.be.revertedWithCustomError(deployedActors.registryKyc, "INVALID_ROOT_CA");
      });

      it("should fail with INVALID_IMAGE when image hash not in PCR0Manager", async () => {
        const mockPubSignals: bigint[] = [
          GCP_ROOT_CA_PUBKEY_HASH,
          1n,
          2n,
          3n,
          0n,
          4n,
          5n,
          6n,
          ...getCurrentDateDigitsYYMMDDHHMMSS().map(BigInt),
        ];

        await expect(
          deployedActors.registryKyc.registerPubkeyCommitment(mockProof.a, mockProof.b, mockProof.c, mockPubSignals),
        ).to.be.revertedWithCustomError(deployedActors.registryKyc, "INVALID_IMAGE");
      });
    });
  });
});
