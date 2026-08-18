import { ethers } from "hardhat";
import { expect } from "chai";
import { deploySystemFixturesV2 } from "../utils/deploymentV2";
import { DeployedActorsV2 } from "../utils/types";

// <=31 ASCII bytes per field element, little-endian within each chunk.
function packAscii(s: string): bigint[] {
  const bytes = Buffer.from(s, "ascii");
  const chunks: bigint[] = [];
  for (let c = 0; c * 31 < bytes.length; c++) {
    let acc = 0n;
    for (let j = 0; j < 31; j++) {
      const i = c * 31 + j;
      if (i >= bytes.length) break;
      acc += BigInt(bytes[i]) * 256n ** BigInt(j);
    }
    chunks.push(acc);
  }
  return chunks;
}

// Copied from registerKyc.test.ts:9 — hoursOffset lets us build stale/future dates.
function getCurrentDateDigitsYYMMDDHHMMSS(hoursOffset: number = 0): bigint[] {
  const d = new Date(Date.now() + hoursOffset * 3600 * 1000);
  const two = (n: number) => [BigInt(Math.floor(n / 10)), BigInt(n % 10)];
  return [
    ...two(d.getUTCFullYear() % 100),
    ...two(d.getUTCMonth() + 1),
    ...two(d.getUTCDate()),
    ...two(d.getUTCHours()),
    ...two(d.getUTCMinutes()),
    ...two(d.getUTCSeconds()),
  ];
}

describe("Hub prover key registration", () => {
  let deployedActors: DeployedActorsV2;
  let snapshotId: string;

  before(async () => {
    deployedActors = await deploySystemFixturesV2();
  });

  beforeEach(async () => {
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  describe("configuration", () => {
    it("stores and returns each config value", async () => {
      const { hub, owner } = deployedActors;
      const verifier = ethers.Wallet.createRandom().address;
      const pcr0 = ethers.Wallet.createRandom().address;
      const tee = await owner.getAddress();

      await hub.updateProverGCPJWTVerifier(verifier);
      await hub.updateProverPCR0Manager(pcr0);
      await hub.updateProverGCPRootCAPubkeyHash(12345n);
      await hub.updateProverTEE(tee);

      expect(await hub.proverGCPJWTVerifier()).to.equal(verifier);
      expect(await hub.proverPCR0Manager()).to.equal(pcr0);
      expect(await hub.proverGCPRootCAPubkeyHash()).to.equal(12345n);
      expect(await hub.proverTEE()).to.equal(tee);
    });

    it("rejects config writes from a non-SECURITY_ROLE caller", async () => {
      const { hub, user1 } = deployedActors;
      await expect(
        hub.connect(user1).updateProverTEE(ethers.Wallet.createRandom().address),
      ).to.be.reverted;
    });

    it("emits an event for each config change", async () => {
      const { hub } = deployedActors;
      const verifier = ethers.Wallet.createRandom().address;
      await expect(hub.updateProverGCPJWTVerifier(verifier))
        .to.emit(hub, "ProverGCPJWTVerifierUpdated")
        .withArgs(verifier);
    });

    it("pins the ERC-7201 namespace to its independently-computed slot", async () => {
      const { hub } = deployedActors;
      const hubAddress = await hub.getAddress();

      // keccak256(abi.encode(uint256(keccak256("self.storage.IdentityVerificationHubProver")) - 1)) & ~bytes32(uint256(0xff))
      const id = BigInt(ethers.keccak256(ethers.toUtf8Bytes("self.storage.IdentityVerificationHubProver")));
      const encoded = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [id - 1n]);
      const mask = ((1n << 256n) - 1n) ^ 0xffn;
      const baseSlot = BigInt(ethers.keccak256(encoded)) & mask;

      // IdentityVerificationHubProverStorage field order:
      // 0: _gcpJwtVerifier, 1: _pcr0Manager, 2: _gcpRootCAPubkeyHash, 3: _proverTee, 4: _isRegisteredProverKey
      const rootCaSlot = ethers.toBeHex(baseSlot + 2n, 32);

      const value = 123456789n;
      await hub.updateProverGCPRootCAPubkeyHash(value);

      const stored = await ethers.provider.getStorage(hubAddress, rootCaSlot);
      expect(BigInt(stored)).to.equal(value);
    });
  });

  describe("registerProverKey", () => {
    const PROVER = "0xab12cd34ef56ab78cd90ef12ab34cd56ef78ab90";
    const ROOT_CA_HASH = 21107503781769611051785921462832133421817512022858926231578334326320168810501n;
    const IMAGE = {
      p0: 177384435506496807268973340845468654286294928521500580044819492874465981028n,
      p1: 175298970718174405520284770870231222447414486446296682893283627688949855078n,
      p2: 13360n,
    };
    const PROOF = {
      a: [1n, 2n] as [bigint, bigint],
      b: [
        [1n, 2n],
        [3n, 4n],
      ] as [[bigint, bigint], [bigint, bigint]],
      c: [1n, 2n] as [bigint, bigint],
    };

    let mockVerifier: any;

    function signals(
      o: {
        rootCa?: bigint;
        nonce?: string;
        pad3?: bigint;
        pad4?: bigint;
        hoursOffset?: number;
      } = {},
    ): bigint[] {
      const [n0, n1] = packAscii((o.nonce ?? PROVER).slice(2));
      return [
        o.rootCa ?? ROOT_CA_HASH,
        n0,
        n1,
        o.pad3 ?? 0n,
        o.pad4 ?? 0n,
        IMAGE.p0,
        IMAGE.p1,
        IMAGE.p2,
        ...getCurrentDateDigitsYYMMDDHHMMSS(o.hoursOffset ?? 0),
      ];
    }

    beforeEach(async () => {
      const { hub, pcr0Manager, owner } = deployedActors;

      const F = await ethers.getContractFactory("MockGCPJWTVerifier");
      mockVerifier = await F.deploy();
      await mockVerifier.waitForDeployment();

      await hub.updateProverGCPJWTVerifier(await mockVerifier.getAddress());
      await hub.updateProverPCR0Manager(await pcr0Manager.getAddress());
      await hub.updateProverGCPRootCAPubkeyHash(ROOT_CA_HASH);
      await hub.updateProverTEE(await owner.getAddress());

      // Test image hash that unpacks to: d2221a0ee83901980c607ceff2edbedf3f6ce5f437eafa5d89be39e9e7487c04
      // (verbatim from registerKyc.test.ts:102-114 — known-good against IMAGE above)
      await pcr0Manager.addPCR0(
        ethers.getBytes("0x" + "d2221a0ee83901980c607ceff2edbedf3f6ce5f437eafa5d89be39e9e7487c04".padStart(32, "0")),
      );
    });

    it("registers the decoded prover address and emits", async () => {
      const { hub } = deployedActors;
      await expect(hub.registerProverKey(PROOF.a, PROOF.b, PROOF.c, signals()))
        .to.emit(hub, "ProverKeyRegistered")
        .withArgs(ethers.getAddress(PROVER));
      expect(await hub.isRegisteredProverKey(ethers.getAddress(PROVER))).to.equal(true);
    });

    it("reverts PROVER_CONFIG_NOT_SET when the verifier is unset", async () => {
      const { hub } = deployedActors;
      await hub.updateProverGCPJWTVerifier(ethers.ZeroAddress);
      await expect(hub.registerProverKey(PROOF.a, PROOF.b, PROOF.c, signals())).to.be.revertedWithCustomError(
        hub,
        "PROVER_CONFIG_NOT_SET",
      );
    });

    it("reverts PROVER_CONFIG_NOT_SET when the root CA hash is unset", async () => {
      const { hub } = deployedActors;
      await hub.updateProverGCPRootCAPubkeyHash(0n);
      await expect(hub.registerProverKey(PROOF.a, PROOF.b, PROOF.c, signals())).to.be.revertedWithCustomError(
        hub,
        "PROVER_CONFIG_NOT_SET",
      );
    });

    it("reverts PROVER_CONFIG_NOT_SET when the PCR0Manager is unset", async () => {
      const { hub } = deployedActors;
      await hub.updateProverPCR0Manager(ethers.ZeroAddress);
      await expect(hub.registerProverKey(PROOF.a, PROOF.b, PROOF.c, signals())).to.be.revertedWithCustomError(
        hub,
        "PROVER_CONFIG_NOT_SET",
      );
    });

    it("reverts INVALID_PROVER_PROOF when the verifier returns false", async () => {
      const { hub } = deployedActors;
      await mockVerifier.setShouldVerify(false);
      await expect(hub.registerProverKey(PROOF.a, PROOF.b, PROOF.c, signals())).to.be.revertedWithCustomError(
        hub,
        "INVALID_PROVER_PROOF",
      );
    });

    it("reverts INVALID_PROVER_ROOT_CA on a pubSignals[0] mismatch", async () => {
      const { hub } = deployedActors;
      await expect(
        hub.registerProverKey(PROOF.a, PROOF.b, PROOF.c, signals({ rootCa: 1n })),
      ).to.be.revertedWithCustomError(hub, "INVALID_PROVER_ROOT_CA");
    });

    it("reverts INVALID_PROVER_IMAGE when the digest is not in PCR0Manager", async () => {
      const { hub } = deployedActors;
      const freshPcr0Manager = await (await ethers.getContractFactory("PCR0Manager")).deploy();
      await freshPcr0Manager.waitForDeployment();
      await hub.updateProverPCR0Manager(await freshPcr0Manager.getAddress());
      await expect(hub.registerProverKey(PROOF.a, PROOF.b, PROOF.c, signals())).to.be.revertedWithCustomError(
        hub,
        "INVALID_PROVER_IMAGE",
      );
    });

    it("reverts INVALID_PROVER_NONCE_PADDING when pubSignals[3] is non-zero", async () => {
      const { hub } = deployedActors;
      await expect(
        hub.registerProverKey(PROOF.a, PROOF.b, PROOF.c, signals({ pad3: 42n })),
      ).to.be.revertedWithCustomError(hub, "INVALID_PROVER_NONCE_PADDING");
    });

    it("reverts INVALID_PROVER_NONCE_PADDING when pubSignals[4] is non-zero", async () => {
      const { hub } = deployedActors;
      await expect(
        hub.registerProverKey(PROOF.a, PROOF.b, PROOF.c, signals({ pad4: 42n })),
      ).to.be.revertedWithCustomError(hub, "INVALID_PROVER_NONCE_PADDING");
    });

    it("reverts INVALID_PROVER_TIMESTAMP for a date over 1h in the past", async () => {
      const { hub } = deployedActors;
      await expect(
        hub.registerProverKey(PROOF.a, PROOF.b, PROOF.c, signals({ hoursOffset: -2 })),
      ).to.be.revertedWithCustomError(hub, "INVALID_PROVER_TIMESTAMP");
    });

    it("reverts INVALID_PROVER_TIMESTAMP for a date over 1h in the future", async () => {
      const { hub } = deployedActors;
      await expect(
        hub.registerProverKey(PROOF.a, PROOF.b, PROOF.c, signals({ hoursOffset: 2 })),
      ).to.be.revertedWithCustomError(hub, "INVALID_PROVER_TIMESTAMP");
    });

    it("reverts ONLY_PROVER_TEE_CAN_ACCESS when the caller is not the prover TEE", async () => {
      const { hub, user1 } = deployedActors;
      await expect(
        hub.connect(user1).registerProverKey(PROOF.a, PROOF.b, PROOF.c, signals()),
      ).to.be.revertedWithCustomError(hub, "ONLY_PROVER_TEE_CAN_ACCESS");
    });

    it("reverts PROVER_CONFIG_NOT_SET when the prover TEE is unset, even for the former TEE caller", async () => {
      const { hub, owner } = deployedActors;
      await hub.updateProverTEE(ethers.ZeroAddress);
      await expect(
        hub.connect(owner).registerProverKey(PROOF.a, PROOF.b, PROOF.c, signals()),
      ).to.be.revertedWithCustomError(hub, "PROVER_CONFIG_NOT_SET");
    });

    it("revokeProverKey clears registration and emits", async () => {
      const { hub } = deployedActors;
      await hub.registerProverKey(PROOF.a, PROOF.b, PROOF.c, signals());
      await expect(hub.revokeProverKey(ethers.getAddress(PROVER)))
        .to.emit(hub, "ProverKeyRevoked")
        .withArgs(ethers.getAddress(PROVER));
      expect(await hub.isRegisteredProverKey(ethers.getAddress(PROVER))).to.equal(false);
    });

    it("revokeProverKey rejects a non-SECURITY_ROLE caller", async () => {
      const { hub, user1 } = deployedActors;
      await expect(hub.connect(user1).revokeProverKey(ethers.getAddress(PROVER))).to.be.reverted;
    });
  });
});
