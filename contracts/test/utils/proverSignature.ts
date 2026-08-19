import { ethers } from "hardhat";
import type { HDNodeWallet, Wallet } from "ethers";
import { DeployedActorsV2 } from "./types";

// Mirrors the TEE prover: keccak256(abi.encode(a, b, c, pubSignals)) signed raw-prehash
// (no EIP-191 prefix). wallet.signMessage would prefix and recover a different address.
export function signProofDigest(
  wallet: Wallet | HDNodeWallet,
  proof: { a: any; b: any; c: any; pubSignals: any },
): string {
  const digest = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256[2]", "uint256[2][2]", "uint256[2]", "uint256[]"],
      [proof.a, proof.b, proof.c, proof.pubSignals],
    ),
  );
  return wallet.signingKey.sign(digest).serialized;
}

// Signs the exact proof a test submits: decodes the abi-encoded GenericProofStruct tuple the
// disclose tests pack into proofPayload, so tampered proofs get signatures over the tampered bytes.
export function signEncodedProof(wallet: Wallet | HDNodeWallet, encodedProof: string): string {
  const [[a, b, c, pubSignals]] = ethers.AbiCoder.defaultAbiCoder().decode(
    ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
    encodedProof,
  );
  return signProofDigest(wallet, { a, b, c, pubSignals });
}

// <=31 ASCII bytes per field element, little-endian within each chunk (PackBytes layout).
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

function currentDateDigits(): bigint[] {
  const d = new Date();
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

// Known-good attestation fixture (verbatim from registerProverKey.test.ts / registerKyc.test.ts).
const ROOT_CA_HASH = 21107503781769611051785921462832133421817512022858926231578334326320168810501n;
const IMAGE = {
  p0: 177384435506496807268973340845468654286294928521500580044819492874465981028n,
  p1: 175298970718174405520284770870231222447414486446296682893283627688949855078n,
  p2: 13360n,
  digestHex: "d2221a0ee83901980c607ceff2edbedf3f6ce5f437eafa5d89be39e9e7487c04",
};
const DUMMY_PROOF = {
  a: [1n, 2n] as [bigint, bigint],
  b: [
    [1n, 2n],
    [3n, 4n],
  ] as [[bigint, bigint], [bigint, bigint]],
  c: [1n, 2n] as [bigint, bigint],
};

// Registers wallet.address as a prover key on the hub via the mocked GCP attestation path.
// Overwrites the hub's prover config with the mock verifier and this fixture's constants.
export async function registerProverWallet(
  deployedActors: DeployedActorsV2,
  wallet: Wallet | HDNodeWallet,
): Promise<void> {
  const { hub, pcr0Manager, owner } = deployedActors;

  const mockVerifier = await (await ethers.getContractFactory("MockGCPJWTVerifier")).deploy();
  await mockVerifier.waitForDeployment();

  await hub.updateProverGCPJWTVerifier(await mockVerifier.getAddress());
  await hub.updateProverPCR0Manager(await pcr0Manager.getAddress());
  await hub.updateProverGCPRootCAPubkeyHash(ROOT_CA_HASH);
  await hub.updateProverTEE(await owner.getAddress());

  // addPCR0 takes the 32-byte digest; isPCR0Set requires the internally padded 48-byte form.
  const padded48 = ethers.getBytes("0x" + "00".repeat(16) + IMAGE.digestHex);
  if (!(await pcr0Manager.isPCR0Set(padded48))) {
    await pcr0Manager.addPCR0(ethers.getBytes("0x" + IMAGE.digestHex));
  }

  const [n0, n1] = packAscii(wallet.address.slice(2).toLowerCase());
  const pubSignals = [ROOT_CA_HASH, n0, n1, 0n, 0n, IMAGE.p0, IMAGE.p1, IMAGE.p2, ...currentDateDigits()];
  await hub.registerProverKey(DUMMY_PROOF.a, DUMMY_PROOF.b, DUMMY_PROOF.c, pubSignals);
}
