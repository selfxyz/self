import { ethers } from "hardhat";
import { deploySystemFixturesV2 } from "../utils/deploymentV2";
import { DeployedActorsV2 } from "../utils/types";
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
 * Mirrors how the GCP JWT circuit outputs values in pubSignals[1-3].
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

/**
 * Computes per-registry sha256 hashes matching on-chain sha256(abi.encodePacked(...)).
 * Returns [passportHash, aadhaarHash, idCardHash, kycHash] — alphabetical by registry key.
 */
function computeRegistryHashes(
  passportRoots: bigint[],
  aadhaarRoots: bigint[],
  idCardRoots: bigint[],
  kycRoots: bigint[],
): [string, string, string, string] {
  const passportHash = ethers.sha256(
    ethers.solidityPacked(["uint256", "uint256", "uint256"], passportRoots),
  );
  const aadhaarHash = ethers.sha256(ethers.solidityPacked(["uint256", "uint256"], aadhaarRoots));
  const idCardHash = ethers.sha256(ethers.solidityPacked(["uint256", "uint256"], idCardRoots));
  const kycHash = ethers.sha256(ethers.solidityPacked(["uint256", "uint256"], kycRoots));
  return [passportHash, aadhaarHash, idCardHash, kycHash];
}

/**
 * Computes the global rootsHash = sha256(abi.encodePacked(registryHashes[0..3])).
 */
function computeGlobalHash(registryHashes: [string, string, string, string]): string {
  return ethers.sha256(ethers.solidityPacked(["bytes32", "bytes32", "bytes32", "bytes32"], registryHashes));
}

describe("OFAC Proof Update test", function () {
  this.timeout(0);

  let deployedActors: DeployedActorsV2;
  let mockVerifier: any;

  const GCP_ROOT_CA_PUBKEY_HASH =
    21107503781769611051785921462832133421817512022858926231578334326320168810501n;

  // Test image hash that unpacks to: d2221a0ee83901980c607ceff2edbedf3f6ce5f437eafa5d89be39e9e7487c04
  const testImageHash = {
    p0: 177384435506496807268973340845468654286294928521500580044819492874465981028n,
    p1: 175298970718174405520284770870231222447414486446296682893283627688949855078n,
    p2: 13360n,
  };

  const mockProof = {
    a: [1n, 2n] as [bigint, bigint],
    b: [
      [1n, 2n],
      [3n, 4n],
    ] as [[bigint, bigint], [bigint, bigint]],
    c: [1n, 2n] as [bigint, bigint],
  };

  // Test OFAC roots (arbitrary non-zero values)
  // Per-registry root ordering (alphabetical by registry key):
  //   [0] IdentityRegistry (Passport): [nameAndDob, nameAndYob, passportNo]
  //   [1] IdentityRegistryAadhaar:     [nameAndDob, nameAndYob]
  //   [2] IdentityRegistryIdCard:      [nameAndDob, nameAndYob]
  //   [3] IdentityRegistryKyc:         [nameAndDob, nameAndYob]
  const passportRoots = [100n, 200n, 300n];
  const aadhaarRoots = [400n, 500n];
  const idCardRoots = [600n, 700n];
  const kycRoots = [800n, 900n];

  before(async () => {
    deployedActors = await deploySystemFixturesV2();

    // Deploy fresh MockGCPJWTVerifier
    const MockVerifierFactory = await ethers.getContractFactory("MockGCPJWTVerifier");
    mockVerifier = await MockVerifierFactory.deploy();
    await mockVerifier.waitForDeployment();

    // Register test PCR0 image hash
    const pcr0Bytes = ethers.getBytes("0xd2221a0ee83901980c607ceff2edbedf3f6ce5f437eafa5d89be39e9e7487c04");
    await deployedActors.pcr0Manager.addPCR0(pcr0Bytes);

    // Configure OFAC proof infrastructure on non-KYC registries via reinitializer(3)
    await deployedActors.registry.initializeOfacProof(
      mockVerifier.target,
      deployedActors.pcr0Manager.target,
      GCP_ROOT_CA_PUBKEY_HASH,
    );
    await deployedActors.registryId.initializeOfacProof(
      mockVerifier.target,
      deployedActors.pcr0Manager.target,
      GCP_ROOT_CA_PUBKEY_HASH,
    );
    await deployedActors.registryAadhaar.initializeOfacProof(
      mockVerifier.target,
      deployedActors.pcr0Manager.target,
      GCP_ROOT_CA_PUBKEY_HASH,
    );

    // Configure KYC registry (already has pcr0Manager from init)
    await deployedActors.registryKyc.updateGCPJWTVerifier(mockVerifier.target);
    await deployedActors.registryKyc.updateGCPRootCAPubkeyHash(GCP_ROOT_CA_PUBKEY_HASH);

    console.log("OFAC proof test setup completed");
  });

  /**
   * Builds pubSignals for a given set of roots and registryHashes.
   */
  function buildPubSignals(registryHashes: [string, string, string, string], hoursOffset = 0): bigint[] {
    const globalHash = computeGlobalHash(registryHashes);
    const [p0, p1, p2] = packUint256ToHexFields(BigInt(globalHash));
    return [
      GCP_ROOT_CA_PUBKEY_HASH,
      p0,
      p1,
      p2,
      0n, // unused
      testImageHash.p0,
      testImageHash.p1,
      testImageHash.p2,
      ...getCurrentDateDigitsYYMMDDHHMMSS(hoursOffset),
    ];
  }

  describe("Successful proof-based updates", () => {
    let snapshotId: string;

    beforeEach(async () => {
      snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    afterEach(async () => {
      await ethers.provider.send("evm_revert", [snapshotId]);
    });

    it("should update all 4 registries with valid proof", async () => {
      const registryHashes = computeRegistryHashes(passportRoots, aadhaarRoots, idCardRoots, kycRoots);
      const pubSignals = buildPubSignals(registryHashes);

      // Update Passport (index 0, 3 roots)
      await expect(
        deployedActors.registry.updateOfacRootsWithProof(
          mockProof.a,
          mockProof.b,
          mockProof.c,
          pubSignals,
          passportRoots,
          registryHashes,
        ),
      ).to.emit(deployedActors.registry, "OfacRootsUpdatedWithProof");

      // Update Aadhaar (index 1, 2 roots)
      await expect(
        deployedActors.registryAadhaar.updateOfacRootsWithProof(
          mockProof.a,
          mockProof.b,
          mockProof.c,
          pubSignals,
          aadhaarRoots,
          registryHashes,
        ),
      ).to.emit(deployedActors.registryAadhaar, "OfacRootsUpdatedWithProof");

      // Update ID Card (index 2, 2 roots)
      await expect(
        deployedActors.registryId.updateOfacRootsWithProof(
          mockProof.a,
          mockProof.b,
          mockProof.c,
          pubSignals,
          idCardRoots,
          registryHashes,
        ),
      ).to.emit(deployedActors.registryId, "OfacRootsUpdatedWithProof");

      // Update KYC (index 3, 2 roots)
      await expect(
        deployedActors.registryKyc.updateOfacRootsWithProof(
          mockProof.a,
          mockProof.b,
          mockProof.c,
          pubSignals,
          kycRoots,
          registryHashes,
        ),
      ).to.emit(deployedActors.registryKyc, "OfacRootsUpdatedWithProof");

      // Verify Passport roots
      expect(await deployedActors.registry.getNameAndDobOfacRoot()).to.equal(passportRoots[0]);
      expect(await deployedActors.registry.getNameAndYobOfacRoot()).to.equal(passportRoots[1]);
      expect(await deployedActors.registry.getPassportNoOfacRoot()).to.equal(passportRoots[2]);

      // Verify Aadhaar roots
      expect(await deployedActors.registryAadhaar.getNameAndDobOfacRoot()).to.equal(aadhaarRoots[0]);
      expect(await deployedActors.registryAadhaar.getNameAndYobOfacRoot()).to.equal(aadhaarRoots[1]);

      // Verify ID Card roots
      expect(await deployedActors.registryId.getNameAndDobOfacRoot()).to.equal(idCardRoots[0]);
      expect(await deployedActors.registryId.getNameAndYobOfacRoot()).to.equal(idCardRoots[1]);

      // Verify KYC roots
      expect(await deployedActors.registryKyc.getNameAndDobOfacRoot()).to.equal(kycRoots[0]);
      expect(await deployedActors.registryKyc.getNameAndYobOfacRoot()).to.equal(kycRoots[1]);
    });

    it("should allow non-owner to call with valid proof (proof IS authorization)", async () => {
      const registryHashes = computeRegistryHashes(passportRoots, aadhaarRoots, idCardRoots, kycRoots);
      const pubSignals = buildPubSignals(registryHashes);

      // user1 (non-owner) should be able to update with valid proof
      await deployedActors.registry
        .connect(deployedActors.user1)
        .updateOfacRootsWithProof(mockProof.a, mockProof.b, mockProof.c, pubSignals, passportRoots, registryHashes);

      expect(await deployedActors.registry.getNameAndDobOfacRoot()).to.equal(passportRoots[0]);
      expect(await deployedActors.registry.getNameAndYobOfacRoot()).to.equal(passportRoots[1]);
      expect(await deployedActors.registry.getPassportNoOfacRoot()).to.equal(passportRoots[2]);
    });

    it("should emit individual root update events", async () => {
      const registryHashes = computeRegistryHashes(passportRoots, aadhaarRoots, idCardRoots, kycRoots);
      const pubSignals = buildPubSignals(registryHashes);

      await expect(
        deployedActors.registry.updateOfacRootsWithProof(
          mockProof.a,
          mockProof.b,
          mockProof.c,
          pubSignals,
          passportRoots,
          registryHashes,
        ),
      )
        .to.emit(deployedActors.registry, "NameAndDobOfacRootUpdated")
        .withArgs(passportRoots[0])
        .and.to.emit(deployedActors.registry, "NameAndYobOfacRootUpdated")
        .withArgs(passportRoots[1])
        .and.to.emit(deployedActors.registry, "PassportNoOfacRootUpdated")
        .withArgs(passportRoots[2]);
    });
  });

  describe("Error cases", () => {
    let snapshotId: string;

    beforeEach(async () => {
      snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    afterEach(async () => {
      await ethers.provider.send("evm_revert", [snapshotId]);
    });

    it("should revert with InvalidRootsCount when wrong number of roots for Passport", async () => {
      const registryHashes = computeRegistryHashes(passportRoots, aadhaarRoots, idCardRoots, kycRoots);
      const pubSignals = buildPubSignals(registryHashes);

      // Passport expects 3 roots, pass 2
      await expect(
        deployedActors.registry.updateOfacRootsWithProof(
          mockProof.a,
          mockProof.b,
          mockProof.c,
          pubSignals,
          [100n, 200n],
          registryHashes,
        ),
      ).to.be.revertedWithCustomError(deployedActors.registry, "InvalidRootsCount");
    });

    it("should revert with InvalidRootsCount when wrong number of roots for KYC", async () => {
      const registryHashes = computeRegistryHashes(passportRoots, aadhaarRoots, idCardRoots, kycRoots);
      const pubSignals = buildPubSignals(registryHashes);

      // KYC expects 2 roots, pass 3
      await expect(
        deployedActors.registryKyc.updateOfacRootsWithProof(
          mockProof.a,
          mockProof.b,
          mockProof.c,
          pubSignals,
          [800n, 900n, 1000n],
          registryHashes,
        ),
      ).to.be.revertedWithCustomError(deployedActors.registryKyc, "InvalidRootsCount");
    });

    it("should revert with INVALID_PROOF when verifier rejects proof", async () => {
      await mockVerifier.setShouldVerify(false);

      const registryHashes = computeRegistryHashes(passportRoots, aadhaarRoots, idCardRoots, kycRoots);
      const pubSignals = buildPubSignals(registryHashes);

      await expect(
        deployedActors.registry.updateOfacRootsWithProof(
          mockProof.a,
          mockProof.b,
          mockProof.c,
          pubSignals,
          passportRoots,
          registryHashes,
        ),
      ).to.be.revertedWithCustomError(deployedActors.registry, "INVALID_PROOF");

      // Reset mock verifier
      await mockVerifier.setShouldVerify(true);
    });

    it("should revert with INVALID_ROOT_CA when rootCA hash does not match", async () => {
      const registryHashes = computeRegistryHashes(passportRoots, aadhaarRoots, idCardRoots, kycRoots);
      const globalHash = computeGlobalHash(registryHashes);
      const [p0, p1, p2] = packUint256ToHexFields(BigInt(globalHash));

      // Use wrong rootCA hash in pubSignals[0]
      const badPubSignals: bigint[] = [
        12345n, // wrong rootCA
        p0,
        p1,
        p2,
        0n,
        testImageHash.p0,
        testImageHash.p1,
        testImageHash.p2,
        ...getCurrentDateDigitsYYMMDDHHMMSS(),
      ];

      await expect(
        deployedActors.registry.updateOfacRootsWithProof(
          mockProof.a,
          mockProof.b,
          mockProof.c,
          badPubSignals,
          passportRoots,
          registryHashes,
        ),
      ).to.be.revertedWithCustomError(deployedActors.registry, "INVALID_ROOT_CA");
    });

    it("should revert with INVALID_IMAGE when image hash not in PCR0Manager", async () => {
      const registryHashes = computeRegistryHashes(passportRoots, aadhaarRoots, idCardRoots, kycRoots);
      const globalHash = computeGlobalHash(registryHashes);
      const [p0, p1, p2] = packUint256ToHexFields(BigInt(globalHash));

      // Use unknown image hash in pubSignals[5-7]
      const badPubSignals: bigint[] = [
        GCP_ROOT_CA_PUBKEY_HASH,
        p0,
        p1,
        p2,
        0n,
        99n, // bad image hash
        99n,
        99n,
        ...getCurrentDateDigitsYYMMDDHHMMSS(),
      ];

      await expect(
        deployedActors.registry.updateOfacRootsWithProof(
          mockProof.a,
          mockProof.b,
          mockProof.c,
          badPubSignals,
          passportRoots,
          registryHashes,
        ),
      ).to.be.revertedWithCustomError(deployedActors.registry, "INVALID_IMAGE");
    });

    it("should revert with INVALID_TIMESTAMP when timestamp is stale (2h past)", async () => {
      const registryHashes = computeRegistryHashes(passportRoots, aadhaarRoots, idCardRoots, kycRoots);
      const pubSignals = buildPubSignals(registryHashes, -2); // 2 hours ago

      await expect(
        deployedActors.registry.updateOfacRootsWithProof(
          mockProof.a,
          mockProof.b,
          mockProof.c,
          pubSignals,
          passportRoots,
          registryHashes,
        ),
      ).to.be.revertedWithCustomError(deployedActors.registry, "INVALID_TIMESTAMP");
    });

    it("should revert with INVALID_TIMESTAMP when timestamp is too far in future (2h)", async () => {
      const registryHashes = computeRegistryHashes(passportRoots, aadhaarRoots, idCardRoots, kycRoots);
      const pubSignals = buildPubSignals(registryHashes, 2); // 2 hours in the future

      await expect(
        deployedActors.registry.updateOfacRootsWithProof(
          mockProof.a,
          mockProof.b,
          mockProof.c,
          pubSignals,
          passportRoots,
          registryHashes,
        ),
      ).to.be.revertedWithCustomError(deployedActors.registry, "INVALID_TIMESTAMP");
    });

    it("should revert with InvalidRootsHash when per-registry hash is tampered", async () => {
      const registryHashes = computeRegistryHashes(passportRoots, aadhaarRoots, idCardRoots, kycRoots);
      const pubSignals = buildPubSignals(registryHashes);

      // Pass wrong roots that don't match registryHashes[0]
      const tamperedRoots = [999n, 888n, 777n];

      await expect(
        deployedActors.registry.updateOfacRootsWithProof(
          mockProof.a,
          mockProof.b,
          mockProof.c,
          pubSignals,
          tamperedRoots,
          registryHashes,
        ),
      ).to.be.revertedWithCustomError(deployedActors.registry, "InvalidRootsHash");
    });

    it("should revert with InvalidRootsHash when global hash is tampered", async () => {
      const registryHashes = computeRegistryHashes(passportRoots, aadhaarRoots, idCardRoots, kycRoots);

      // Tamper one registry hash so global hash won't match pubSignals
      const tamperedHashes: [string, string, string, string] = [...registryHashes];
      tamperedHashes[2] = ethers.sha256(ethers.solidityPacked(["uint256", "uint256"], [999n, 888n]));

      // Build pubSignals with the ORIGINAL global hash
      const pubSignals = buildPubSignals(registryHashes);

      // Pass tampered registryHashes — per-registry hash matches roots, but global hash won't match proof
      const idCardTamperedRoots = [999n, 888n]; // matches tamperedHashes[2]

      await expect(
        deployedActors.registryId.updateOfacRootsWithProof(
          mockProof.a,
          mockProof.b,
          mockProof.c,
          pubSignals,
          idCardTamperedRoots,
          tamperedHashes,
        ),
      ).to.be.revertedWithCustomError(deployedActors.registryId, "InvalidRootsHash");
    });

    it("should revert on each registry type with InvalidRootsCount", async () => {
      const registryHashes = computeRegistryHashes(passportRoots, aadhaarRoots, idCardRoots, kycRoots);
      const pubSignals = buildPubSignals(registryHashes);

      // Aadhaar expects 2 roots, pass 1
      await expect(
        deployedActors.registryAadhaar.updateOfacRootsWithProof(
          mockProof.a,
          mockProof.b,
          mockProof.c,
          pubSignals,
          [400n],
          registryHashes,
        ),
      ).to.be.revertedWithCustomError(deployedActors.registryAadhaar, "InvalidRootsCount");

      // ID Card expects 2 roots, pass 3
      await expect(
        deployedActors.registryId.updateOfacRootsWithProof(
          mockProof.a,
          mockProof.b,
          mockProof.c,
          pubSignals,
          [600n, 700n, 800n],
          registryHashes,
        ),
      ).to.be.revertedWithCustomError(deployedActors.registryId, "InvalidRootsCount");
    });
  });

  describe("Config setters (non-KYC registries)", () => {
    let snapshotId: string;

    beforeEach(async () => {
      snapshotId = await ethers.provider.send("evm_snapshot", []);
    });

    afterEach(async () => {
      await ethers.provider.send("evm_revert", [snapshotId]);
    });

    it("should allow SECURITY_ROLE to update GCP JWT verifier on Passport registry", async () => {
      const newVerifier = ethers.Wallet.createRandom().address;
      await expect(deployedActors.registry.updateGCPJWTVerifier(newVerifier))
        .to.emit(deployedActors.registry, "GCPJWTVerifierUpdated")
        .withArgs(newVerifier);
    });

    it("should allow SECURITY_ROLE to update PCR0Manager on Passport registry", async () => {
      const newManager = ethers.Wallet.createRandom().address;
      await expect(deployedActors.registry.updatePCR0Manager(newManager))
        .to.emit(deployedActors.registry, "PCR0ManagerUpdated")
        .withArgs(newManager);
    });

    it("should allow SECURITY_ROLE to update GCP root CA hash on Passport registry", async () => {
      const newHash = 99999n;
      await expect(deployedActors.registry.updateGCPRootCAPubkeyHash(newHash))
        .to.emit(deployedActors.registry, "GCPRootCAPubkeyHashUpdated")
        .withArgs(newHash);
    });

    it("should not allow non-SECURITY_ROLE to update GCP JWT verifier", async () => {
      await expect(
        deployedActors.registry
          .connect(deployedActors.user1)
          .updateGCPJWTVerifier(ethers.Wallet.createRandom().address),
      ).to.be.revertedWithCustomError(deployedActors.registry, "AccessControlUnauthorizedAccount");
    });

    it("should not allow non-SECURITY_ROLE to update PCR0Manager", async () => {
      await expect(
        deployedActors.registry
          .connect(deployedActors.user1)
          .updatePCR0Manager(ethers.Wallet.createRandom().address),
      ).to.be.revertedWithCustomError(deployedActors.registry, "AccessControlUnauthorizedAccount");
    });

    it("should not allow non-SECURITY_ROLE to update GCP root CA hash", async () => {
      await expect(
        deployedActors.registry.connect(deployedActors.user1).updateGCPRootCAPubkeyHash(99999n),
      ).to.be.revertedWithCustomError(deployedActors.registry, "AccessControlUnauthorizedAccount");
    });
  });
});
