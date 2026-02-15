/**
 * OFAC Proof Update — Upgrade Path Test
 *
 * Validates that:
 * 1. A KYC proxy with the current implementation can be upgraded
 * 2. State (OFAC roots, IMT) survives the upgrade
 * 3. updateOfacRootsWithProof works after upgrade
 * 4. The new function is callable by non-owners (proof IS authorization)
 *
 * This test deploys a full system, sets some OFAC roots via the old setter
 * functions, then upgrades the implementation and verifies everything works
 * with the proof-based update path.
 */

import { ethers } from "hardhat";
import { deploySystemFixturesV2 } from "../utils/deploymentV2";
import { DeployedActorsV2 } from "../utils/types";
import { expect } from "chai";

const GCP_ROOT_CA_PUBKEY_HASH =
  21107503781769611051785921462832133421817512022858926231578334326320168810501n;

function packUint256ToHexFields(value: bigint): [bigint, bigint, bigint] {
  const hexStr = value.toString(16).padStart(64, "0");
  const bytes = Buffer.from(hexStr, "utf8");
  let p0 = 0n, p1 = 0n, p2 = 0n;
  for (let i = 0; i < Math.min(31, bytes.length); i++) p0 |= BigInt(bytes[i]) << BigInt(i * 8);
  for (let i = 31; i < Math.min(62, bytes.length); i++) p1 |= BigInt(bytes[i]) << BigInt((i - 31) * 8);
  for (let i = 62; i < Math.min(93, bytes.length); i++) p2 |= BigInt(bytes[i]) << BigInt((i - 62) * 8);
  return [p0, p1, p2];
}

function getCurrentDateDigitsYYMMDDHHMMSS(): bigint[] {
  const now = new Date();
  const pad2 = (n: number) => n.toString().padStart(2, "0");
  const yy = pad2(now.getUTCFullYear() % 100);
  const mm = pad2(now.getUTCMonth() + 1);
  const dd = pad2(now.getUTCDate());
  const hh = pad2(now.getUTCHours());
  const min = pad2(now.getUTCMinutes());
  const ss = pad2(now.getUTCSeconds());
  return `${yy}${mm}${dd}${hh}${min}${ss}`.split("").map(Number).map(BigInt);
}

describe("OFAC Upgrade Path Test", function () {
  this.timeout(0);

  let actors: DeployedActorsV2;
  let mockVerifier: any;

  const testImageHash = {
    p0: 177384435506496807268973340845468654286294928521500580044819492874465981028n,
    p1: 175298970718174405520284770870231222447414486446296682893283627688949855078n,
    p2: 13360n,
  };

  before(async () => {
    actors = await deploySystemFixturesV2();

    // Deploy fresh MockGCPJWTVerifier
    const MockVerifierFactory = await ethers.getContractFactory("MockGCPJWTVerifier");
    mockVerifier = await MockVerifierFactory.deploy();
    await mockVerifier.waitForDeployment();

    // Register test PCR0 image hash
    const pcr0Bytes = ethers.getBytes("0xd2221a0ee83901980c607ceff2edbedf3f6ce5f437eafa5d89be39e9e7487c04");
    await actors.pcr0Manager.addPCR0(pcr0Bytes);
  });

  it("should preserve state after upgrade and allow proof-based updates", async () => {
    // --- Phase 1: Set some OFAC roots using old setter functions ---
    const initialDobRoot = 12345n;
    const initialYobRoot = 67890n;

    await actors.registryKyc.updateNameAndDobOfacRoot(initialDobRoot);
    await actors.registryKyc.updateNameAndYobOfacRoot(initialYobRoot);

    // Verify old roots are set
    expect(await actors.registryKyc.getNameAndDobOfacRoot()).to.equal(initialDobRoot);
    expect(await actors.registryKyc.getNameAndYobOfacRoot()).to.equal(initialYobRoot);
    console.log(`  Pre-upgrade OFAC roots: DOB=${initialDobRoot}, YOB=${initialYobRoot}`);

    // --- Phase 2: Upgrade KYC implementation ---
    // Deploy new implementation (needs PoseidonT3 library linked)
    const KycFactory = await ethers.getContractFactory("IdentityRegistryKycImplV1", {
      libraries: {
        PoseidonT3: await actors.poseidonT3.getAddress(),
      },
    });
    const newImpl = await KycFactory.deploy();
    await newImpl.waitForDeployment();
    console.log(`  New KYC impl deployed: ${newImpl.target}`);

    // Get proxy address
    const proxyAddress = await actors.registryKyc.getAddress();

    // Upgrade via upgradeToAndCall (no reinitializer data for KYC)
    await actors.registryKyc.upgradeToAndCall(newImpl.target, "0x");
    console.log(`  Proxy upgraded to new implementation`);

    // --- Phase 3: Verify state survived ---
    expect(await actors.registryKyc.getNameAndDobOfacRoot()).to.equal(initialDobRoot);
    expect(await actors.registryKyc.getNameAndYobOfacRoot()).to.equal(initialYobRoot);
    console.log(`  State preserved: DOB=${initialDobRoot}, YOB=${initialYobRoot}`);

    // --- Phase 4: Configure mock verifier for proof-based updates ---
    await actors.registryKyc.updateGCPJWTVerifier(mockVerifier.target);
    await actors.registryKyc.updateGCPRootCAPubkeyHash(GCP_ROOT_CA_PUBKEY_HASH);

    // --- Phase 5: Call updateOfacRootsWithProof ---
    const passportRoots = [100n, 200n, 300n];
    const aadhaarRoots = [400n, 500n];
    const idCardRoots = [600n, 700n];
    const kycRoots = [800n, 900n];

    const passportHash = ethers.sha256(ethers.solidityPacked(["uint256", "uint256", "uint256"], passportRoots));
    const aadhaarHash = ethers.sha256(ethers.solidityPacked(["uint256", "uint256"], aadhaarRoots));
    const idCardHash = ethers.sha256(ethers.solidityPacked(["uint256", "uint256"], idCardRoots));
    const kycHash = ethers.sha256(ethers.solidityPacked(["uint256", "uint256"], kycRoots));
    const registryHashes: [string, string, string, string] = [passportHash, aadhaarHash, idCardHash, kycHash];

    const globalHash = ethers.sha256(ethers.solidityPacked(["bytes32", "bytes32", "bytes32", "bytes32"], registryHashes));
    const [p0, p1, p2] = packUint256ToHexFields(BigInt(globalHash));

    const pubSignals: bigint[] = [
      GCP_ROOT_CA_PUBKEY_HASH,
      p0, p1, p2,
      0n,
      testImageHash.p0, testImageHash.p1, testImageHash.p2,
      ...getCurrentDateDigitsYYMMDDHHMMSS(),
    ];

    const mockProof = {
      a: [1n, 2n] as [bigint, bigint],
      b: [[1n, 2n], [3n, 4n]] as [[bigint, bigint], [bigint, bigint]],
      c: [1n, 2n] as [bigint, bigint],
    };

    // Call from non-owner (proof IS authorization)
    const proofTx = await actors.registryKyc
      .connect(actors.user1)
      .updateOfacRootsWithProof(
        mockProof.a,
        mockProof.b,
        mockProof.c,
        pubSignals,
        kycRoots,
        registryHashes,
      );
    await proofTx.wait();

    // --- Phase 6: Verify new roots ---
    expect(await actors.registryKyc.getNameAndDobOfacRoot()).to.equal(800n);
    expect(await actors.registryKyc.getNameAndYobOfacRoot()).to.equal(900n);
    console.log(`  Proof-based update succeeded: DOB=800, YOB=900`);

    // --- Phase 7: Verify old setter functions still work after upgrade ---
    await actors.registryKyc.updateNameAndDobOfacRoot(11111n);
    expect(await actors.registryKyc.getNameAndDobOfacRoot()).to.equal(11111n);
    console.log(`  Old setter still works after upgrade: DOB=11111`);

    console.log(`\n  ✅ Upgrade path test passed — state preserved, proof updates work, old setters still work`);
  });
});
