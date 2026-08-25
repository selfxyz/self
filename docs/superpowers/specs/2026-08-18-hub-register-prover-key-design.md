# registerProverKey on the Identity Verification Hub

**Date:** 2026-08-18
**Status:** Approved design, not yet implemented
**Base branch:** `dev`
**Companion work:** `selfxyz/tee-prover-server` PR #36 (the enclave side, already open)

## Problem

`tee-prover-server` now mints a secp256k1 key inside a Confidential Space enclave, has
Google attest to it via the attestation-token nonce, and signs every proof it produces.
Consumers can verify those signatures, but nothing anchors the signing key to an attested
enclave on-chain — so a signature proves only that *some* key signed, not that the key
belongs to a genuine, measured prover.

There is no on-chain surface for a prover key today. `registerPubkeyCommitment` exists only
on `IdentityRegistryKycImplV1`, and a key registered there is treated as **KYC-attestor
authority** by `RegisterProofVerifierLib.sol:101-108` — so reusing it would grant the prover
the power to attest KYC identities.

## Goals

- A prover key's provenance is anchored on-chain, verifiable by any off-chain consumer.
- Registration requires a valid Confidential Space attestation proof for a measured image.
- A compromised prover key can be retired.

## Non-goals

- Verifying prover *signatures* on-chain. Nothing in the hub consults them; this registry is
  a public record for off-chain consumers.
- Any change to the KYC attestation path, `RegisterProofVerifierLib`, or
  `IdentityRegistryKycImplV1`.
- Extracting the duplicated GCP JWT verification body (see "Accepted costs").

## Why the hub and not the KYC registry

A prover key is orthogonal to attestation type: the prover produces passport, EU ID, Aadhaar
and KYC proofs alike. The hub is the attestation-agnostic entry point every integrator
already routes through.

The KYC registry was the tempting home only because it is the sole contract holding the GCP
JWT verification plumbing (`_gcpJwtVerifier`, `_gcpRootCAPubkeyHash`, `_PCR0Manager`,
`_tee`) — the hub has none of it. That is expedience, not design, and it carries a real
hazard: a prover key in that contract sits one mapping away from `checkPubkeyCommitment`,
which confers KYC-attestor authority. On the hub, there is nothing for a prover key to be
confused with.

## Storage

**The hub mixes two storage patterns**, which makes this the highest-risk part of the change:

1. `ImplRoot`'s inherited storage — `AccessControlUpgradeable`, `UUPSUpgradeable`, and
   `uint256[50] private __gap`.
2. Exactly one plain sequential state variable on the hub itself:
   `uint256 public AADHAAR_REGISTRATION_WINDOW`.
3. Two ERC-7201 namespaced structs at collision-resistant slots, which are not part of the
   sequential layout at all.

**Decision: add zero plain state variables.** All new state lives in a third ERC-7201
namespace, which is immune to ordering concerns by construction:

```solidity
/// @custom:storage-location erc7201:self.storage.IdentityVerificationHubProver
struct IdentityVerificationHubProverStorage {
    address _gcpJwtVerifier;
    address _pcr0Manager;
    uint256 _gcpRootCAPubkeyHash;
    address _proverTee;
    mapping(address proverKey => bool) _isRegisteredProverKey;
}

/// @dev keccak256(abi.encode(uint256(keccak256("self.storage.IdentityVerificationHubProver")) - 1)) & ~bytes32(uint256(0xff))
bytes32 private constant IDENTITYVERIFICATIONHUBPROVER_STORAGE_LOCATION =
    0x76afff5e6fcbd388aa8aee87a47ca8d919948df285010f5bede324c9e7235300;
```

That constant was computed and the derivation was validated by reproducing the repo's
existing `self.storage.IdentityVerificationHubV2` slot
(`0xf9b5980d…306c00`) with the same steps — so the value is verified, not asserted.

A new namespace rather than appending to `IdentityVerificationHubV2Storage`: appending to
that struct would also be safe, but a separate namespace makes the feature's storage
self-documenting and cannot interact with the existing layout even under future edits.

**Required verification, not assertion:** produce `forge inspect
IdentityVerificationHubImplV2 storageLayout` before and after the change and confirm the
diff adds only the new namespace — no existing slot moves. This is a live upgradeable
contract behind a proxy; "we were careful" is not evidence.

## Interface

| Function | Access | Purpose |
|---|---|---|
| `registerProverKey(uint256[2] pA, uint256[2][2] pB, uint256[2] pC, uint256[20] pubSignals)` | `onlyProxy onlyProverTEE` | Verify the attestation proof and register the prover address |
| `revokeProverKey(address proverKey)` | `onlyProxy onlyRole(SECURITY_ROLE)` | Retire a compromised key |
| `isRegisteredProverKey(address proverKey) view returns (bool)` | public | For off-chain consumers |
| `updateProverGCPJWTVerifier(address)` | `SECURITY_ROLE` | config |
| `updateProverPCR0Manager(address)` | `SECURITY_ROLE` | config |
| `updateProverGCPRootCAPubkeyHash(uint256)` | `SECURITY_ROLE` | config |
| `updateProverTEE(address)` | `SECURITY_ROLE` | authorized submitter |

Every setter emits an event. Events: `ProverKeyRegistered(address indexed proverKey)`,
`ProverKeyRevoked(address indexed proverKey)`, and one per config setter.

`revokeProverKey` exists because the KYC pattern's mapping sets `true` and never unsets it,
so a compromised key there would stay valid forever. This one starts with revocation rather
than inheriting that gap.

**Revocation semantics, stated explicitly:** revoke sets the flag to `false`. It is *not* a
permanent blacklist. Re-registering the same address would require producing a fresh, valid
attestation proof binding it — which requires that key material inside a measured enclave —
so a permanent blacklist would add state for no practical gain. Keys are ephemeral per boot,
so a revoked address will not recur naturally in any case.

## registerProverKey verification order

Mirrors `IdentityRegistryKycImplV1.registerPubkeyCommitment:496-535`:

1. **Config guard.** Revert `PROVER_CONFIG_NOT_SET` if `_gcpJwtVerifier`, `_pcr0Manager`, or
   `_proverTee` is `address(0)`, or `_gcpRootCAPubkeyHash` is zero. A fresh proxy must never
   treat an unset verifier as "skip verification."
2. `IGCPJWTVerifier(_gcpJwtVerifier).verifyProof(pA, pB, pC, pubSignals)` — revert
   `INVALID_PROOF`.
3. `pubSignals[0] != _gcpRootCAPubkeyHash` — revert `INVALID_ROOT_CA`.
4. `IPCR0Manager(_pcr0Manager).isPCR0Set(GCPJWTHelper.unpackAndConvertImageHash(pubSignals[5], pubSignals[6], pubSignals[7]))`
   — revert `INVALID_IMAGE`.
5. **Trailing nonce chunks must be zero:** revert `INVALID_NONCE_PADDING` unless
   `pubSignals[3] == 0 && pubSignals[4] == 0` (see below).
6. Timestamp window: reassemble `pubSignals[8..19]` via
   `Formatter.toTimeStampWithSeconds` and revert `INVALID_TIMESTAMP` outside ±1 hour of
   `block.timestamp`.
7. `_isRegisteredProverKey[GCPJWTHelper.unpackAndDecodeAddress(pubSignals[1], pubSignals[2])] = true`
   and emit.

### Public-signal layout (why the indices are what they are)

The `gcp_jwt_verifier` circuit emits 20 public signals — outputs first, then public inputs:

| Index | Signal | Width | Derivation |
|---|---|---|---|
| 0 | `rootCAPubkeyHash` | 1 | single Poseidon hash |
| 1–4 | `eat_nonce_0_b64_packed` | 4 | `ceil(99/31)`, from `MAX_EAT_NONCE_B64_LENGTH = 99` |
| 5–7 | `image_hash_packed` | 3 | `ceil(64/31)`, the hex chars after `sha256:` |
| 8–19 | `current_date` | 12 | declared `public` at `component main` |

### The trailing-chunk assertion

The nonce field always occupies **four** signals, but the prover address is 40 hex
characters, filling only `ceil(40/31) = 2`. `eat_nonce_0_b64_length` is a circuit *input*,
not a public signal, so the contract cannot read the nonce's declared length. Asserting
`pubSignals[3] == 0 && pubSignals[4] == 0` is therefore the only on-chain way to bound the
nonce — without it, a longer attested nonce could carry extra content past a contract that
reads only the first two chunks.

## New library helper

`GCPJWTHelper.unpackAndDecodeAddress(uint256 p0, uint256 p1) internal pure returns (address)`
— unpacks two `PackBytes` chunks into 40 ASCII hex characters and hex-decodes them to an
address, reusing the existing `_hexToNibble`. It mirrors `unpackAndDecodeHexPubkey`'s shape;
the difference is 2 chunks instead of 3 and an `address` return.

**Cross-repo coupling.** This requires the nonce to carry the **bare 40 hex characters, no
`0x` prefix**. The enclave currently sends the 42-character `0x…` form. The one-line change
belongs in `jwt-input-generator/index.ts` and its nonce-binding assertion, on the branch in
`tee-prover-server` PR #36, which is still open. Putting the `0x`-stripping in the contract
instead would push string-format knowledge into Solidity; keeping it in the sidecar keeps the
helper a pure hex decoder.

## Accepted costs

**Config duplication.** `_gcpRootCAPubkeyHash` and the `_pcr0Manager` pointer now exist in
both the hub and the KYC registry. Rotating one and forgetting the other is a live
operational hazard, chosen deliberately in exchange for the hub not depending on the KYC
registry at runtime. Mitigations: every setter emits an event so drift is observable
off-chain, and the config guard means an unset value fails loudly rather than silently.
A rotation runbook must touch both contracts.

**A third copy of the verification body.** That verifier + root-CA + PCR0 + timestamp
sequence is already duplicated twice inside `IdentityRegistryKycImplV1`
(`:503-510` and `:556-563`); this adds a third. Extracting it into a shared contract was
considered and rejected for this change because it would modify live KYC code paths. It
remains the right follow-up.

## Testing

| Case | Expectation |
|---|---|
| Valid proof, mocked verifier, PCR0 set, fresh timestamp | address registered, event emitted |
| Config unset (each of the four values) | `PROVER_CONFIG_NOT_SET` |
| Verifier returns false | `INVALID_PROOF` |
| `pubSignals[0]` mismatch | `INVALID_ROOT_CA` |
| Image digest not in `PCR0Manager` | `INVALID_IMAGE` |
| `pubSignals[3]` or `[4]` non-zero | `INVALID_NONCE_PADDING` |
| Timestamp >1h past / >1h future | `INVALID_TIMESTAMP` |
| Caller is not `_proverTee` | reverts |
| `revokeProverKey` then `isRegisteredProverKey` | false |
| `unpackAndDecodeAddress` round-trip | known packing → known address |
| Storage layout before/after | only the new namespace added |

Existing mocks to follow: `contracts/tests/MockOwnableHub.sol`, `MockGCPJWTVerifier.sol`,
`MockUpgradedHub.sol`.

## Out of scope

Deploying the hub upgrade, granting `_proverTee`, registering the prover's image digests in
`PCR0Manager` (note: **both** `Dockerfile.tee`'s seven variants and `Dockerfile.cherrypick`,
since the latter now contains Node), and flipping the `chain` feature in
`tee-prover-server`.
