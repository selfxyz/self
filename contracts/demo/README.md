# SelfVerificationRegistry — Vision & Architecture

On-chain boolean identity verification with zero PII leakage and cross-app unlinkability.

## Table of Contents

1. [The Problem — Privacy vs Trust Tradeoff](#1-the-problem--privacy-vs-trust-tradeoff)
2. [The Solution — SelfVerificationRegistry](#2-the-solution--selfverificationregistry)
3. [Why This Doesn't Break Privacy or Add Trust](#3-why-this-doesnt-break-privacy-or-add-trust)
4. [How It Fits Together — Full Integration Vision](#4-how-it-fits-together--full-integration-vision)
5. [End-to-End Flow (Registry Path)](#5-end-to-end-flow-registry-path)
6. [What's Built vs What's Next](#6-whats-built-vs-whats-next)
7. [Running the Demo](#7-running-the-demo)
8. [Dev Pitch](#8-dev-pitch)

---

## 1. The Problem — Privacy vs Trust Tradeoff

Self currently has three verification pathways. Each forces a tradeoff:

| Pathway | Privacy | Trustless | On-chain composable | The catch |
|---------|---------|-----------|---------------------|-----------|
| **Hub V2 direct** (on-chain) | No | Yes | Yes | `GenericDiscloseOutputV2` leaks PII — name, DOB, nationality, document number all land on-chain |
| **Widget WebSocket** (off-chain) | Yes | No | No | Proof goes to app's webhook, result stored in app DB. Other contracts can't query it. You must trust the app's backend. |
| **OAuth/JWT** (off-chain) | Yes | No | No | `verify.self.xyz` issues a JWT. You must trust the Ed25519 signing key. Other contracts can't query it. |

**The gap:** no existing pathway is **trustless AND private AND composable on-chain**.

A DeFi protocol that wants to gate lending on "user is over 18 and not OFAC-sanctioned" has two bad options today: put PII on-chain (Hub V2 direct), or trust someone else's backend (widget/OAuth). The registry closes this gap.

## 2. The Solution — SelfVerificationRegistry

The registry adds a fourth pathway: on-chain boolean storage downstream of Hub V2, with no PII.

**How it works:**

- `SelfVerificationFactory` deploys EIP-1167 minimal proxy clones — one per app
- Each clone (`SelfVerificationApp`) stores **only** `{verifiedAt, expiresAt}` per user — no PII touches the chain
- Any contract calls `factory.isVerified(appId, user)` — trustless, no oracle, no off-chain dependency
- Cross-app unlinkability via unique `Poseidon(cloneAddress, scopeSeed)` — each clone has a different address, producing a different nullifier scope

**What gets stored on-chain:**

```
verifications[userAddress] = {
    verifiedAt: 1709500000,   // block.timestamp when verified
    expiresAt:  1741036000    // min(docExpiry, now + maxProofAge)
}
nullifierToUser[nullifier] = userAddress
```

That's it. No name. No date of birth. No nationality. No document number.

## 3. Why This Doesn't Break Privacy or Add Trust

This is the critical argument. The registry sits downstream of Hub V2 and stores less data, not more.

### No new trust assumptions

The ZK proof is validated by Hub V2 — the same contract and the same circuits used in the direct on-chain path. The registry doesn't verify proofs itself; it receives a callback from Hub V2 after successful verification. If you trust Hub V2 today, you trust the registry.

### No PII leakage

The `customVerificationHook` in `SelfVerificationApp` reads exactly three fields from `GenericDiscloseOutputV2`:

- `userIdentifier` — the user's wallet address (already public)
- `nullifier` — a pseudonymous, scope-specific identifier
- `expiryDate` — the document expiry (used to compute `expiresAt`, not stored directly)

Everything else — `revealedData_packed` (name, DOB, nationality, document number) — is **ignored**. Never read, never stored, never emitted. The `UserVerified` event contains only `(user, nullifier, expiresAt)`.

### Nullifier unlinkability

Each clone has a unique contract address, which feeds into `Poseidon(address, scopeSeed)` to produce a unique scope. The same passport produces a **different nullifier** for each app. The dating app's clone cannot learn that you also verified on the gambling site's clone, because the nullifiers are cryptographically unrelated.

### Same ZK guarantees

The proof is identical — same Noir circuits, same verification logic, same Hub V2 contract. The registry is a storage layer that records "Hub V2 said yes" without recording why.

### The relayer is a gas sponsor, not a trust anchor

The relayer calls `verifySelfProof()` on the clone, but it cannot forge a verification. Hub V2 validates the proof cryptographically before invoking the callback. A malicious relayer can:

- **Refuse to relay** (liveness issue — the user can't get verified, but no false verifications are created)
- **Not** create fake verifications, modify proof parameters, or bypass Hub V2's validation

This is the same trust model as any gas relayer / meta-transaction system.

## 4. How It Fits Together — Full Integration Vision

```
                              +-------------------------------------+
                              |         Self Mobile App             |
                              |   (passport scan -> ZK proof gen)   |
                              +----------------+--------------------+
                                               | proof
                    +--------------------------+-------------------------+
                    |                          |                         |
                    v                          v                         v
           Widget WebSocket              OAuth/JWT               Registry (NEW)
            (off-chain)                 (off-chain)               (on-chain)
                    |                          |                         |
                    v                          v                         v
            App webhook              verify.self.xyz             Hub V2 -> Clone
            SelfBackendVerifier      issues JWT                  stores boolean
                    |                          |                         |
                    v                          v                         v
            App DB stores            App verifies JWT            Any contract reads
            result privately         claims privately            isVerified() trustlessly
```

### When to use which

| Pathway | Best for | Key property |
|---------|----------|--------------|
| **Widget WebSocket** | Web2 apps, maximum privacy, app controls verification | Private, app-scoped, off-chain |
| **OAuth/JWT** | Standard web auth, session-based, familiar developer model | Private, session-based, off-chain |
| **Registry** | DeFi, DAOs, on-chain composability — any contract can gate on `isVerified()` | Trustless, composable, on-chain |

The three pathways are complementary, not competing. A developer picks the one that matches their architecture. The registry fills the gap for on-chain use cases that can't rely on off-chain trust.

## 5. End-to-End Flow (Registry Path)

```
Developer                HTTP API            Relayer             Factory            Clone           Hub V2
    |                       |                   |                   |                  |                |
    |-- POST /register-app >|                   |                   |                  |                |
    |   {name, config}      |-- store config -->|                   |                  |                |
    |<-- { appId: 42 } -----|                   |                   |                  |                |
    |                       |                   |                   |                  |                |
    | <self-verify app-id="42" endpoint-type="celo">                |                  |                |
    |                       |                   |                   |                  |                |
User scans passport         |                   |                   |                  |                |
    |-- proof via WS ------>|------------------>|                   |                  |                |
    |                       |                   |                   |                  |                |
    |                       |                   |-- createApp(42) ->|                  |                |
    |                       |                   |                   |-- deploy clone ->|                |
    |                       |                   |                   |   initialize() ->|-- setConfig -->|
    |                       |                   |                   |                  |                |
    |                       |                   |-- verifySelfProof()---------------->|                |
    |                       |                   |                   |                  |-- verify() --->|
    |                       |                   |                   |                  |<-- callback ---|
    |                       |                   |                   |                  |                |
    |                       |                   |                   |  verifications[user] = {now, exp} |
    |                       |                   |                   |  nullifier[N] = user              |
    |                       |                   |<-- success -------|                  |                |
    |<-- self:success ------|-------------------|                   |                  |                |
    |                       |                   |                   |                  |                |
Any Contract:               |                   |                   |                  |                |
  factory.isVerified(42, user) ----------------------------------->| clone.isVerified |                |
                                                                   |<-- true/false ---|                |
```

**Key steps:**

1. **Developer registers** an app via HTTP API — gets an `appId` and configures verification requirements (age, OFAC, forbidden countries)
2. **Widget integration** — developer adds `<self-verify app-id="42" endpoint-type="celo">` to their frontend
3. **User scans passport** — Self mobile app generates a ZK proof, sends it via WebSocket to the relayer
4. **Relayer deploys clone** (if first verification for this app) — `createApp()` deploys an EIP-1167 proxy, initializes it with the app's config and a unique Poseidon scope
5. **Relayer submits proof** — `verifySelfProof()` on the clone forwards to Hub V2 for cryptographic validation
6. **Hub V2 callback** — on success, `customVerificationHook` stores only the boolean result and expiry
7. **Any contract queries** — `factory.isVerified(appId, user)` returns true/false, no oracle needed

## 6. What's Built vs What's Next

| Component | Status | Location |
|-----------|--------|----------|
| SelfVerificationFactory | Done | `contracts/SelfVerificationFactory.sol` |
| SelfVerificationApp | Done | `contracts/SelfVerificationApp.sol` |
| 33 Forge tests | Done | `test/foundry/SelfVerificationFactory.t.sol` |
| Deploy script | Done | `script/DeploySelfVerificationFactory.s.sol` |
| Interactive anvil demo | Done | `demo/index.html` |
| Relayer integration | Next | `self-infra/relayer` — add `createApp()` + `verifySelfProof()` calls |
| Widget `endpoint-type="celo"` | Next | `sdk/widget` — route proof to on-chain instead of webhook |
| HTTP API `/register-app` | Next | `verify-service` — app registration endpoint |
| Celo mainnet deployment | Next | Deploy factory + implementation to Celo 42220 |

## 7. Running the Demo

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (forge + anvil)
- A browser

### Quick Start

```bash
# 1. Start a local chain
anvil

# 2. In a second terminal, deploy the contracts
cd contracts/
forge script script/DemoSelfVerification.s.sol \
  --rpc-url http://localhost:8545 --broadcast

# 3. Open the demo page
open demo/index.html
```

The demo page auto-connects to `localhost:8545` with pre-configured contract addresses from the deploy script.

### What the Deploy Script Does

`DemoSelfVerification.s.sol` runs 6 phases on local anvil:

1. **Deploy** — MockHubV2, SelfVerificationApp (implementation), SelfVerificationFactory (behind UUPS proxy)
2. **Create 2 apps** — App 1 "DemoApp Simple" and App 2 "DemoApp OFAC+Age" (with age > 18 and OFAC enabled)
3. **Verify Alice** on App 1 — full `verifySelfProof()` flow with mock Hub callback
4. **Cross-app isolation** — verify Alice on App 2, show both apps have different clone addresses and scopes
5. **Verify Bob** on App 1 — second user with different nullifier
6. **Sybil test** — attempt to verify a different wallet with Alice's nullifier, confirm it reverts

### Using the Demo Page

The demo has 4 tabs:

| Tab | What it does |
|-----|-------------|
| **1. Create App** | Deploy a new EIP-1167 clone via the factory. Shows clone address and gas cost. |
| **2. Verify User** | Simulate a passport verification. Configures mock Hub, calls `verifySelfProof()`, shows stored result with expiry. |
| **3. Query** | Call `factory.isVerified(appId, user)` and explore app details (scope, config, etc.). Includes a Solidity integration example. |
| **4. Sybil Test** | Attempt a sybil attack (different wallet, same nullifier) and see the `DuplicateNullifier` revert. Compare scopes across apps. |

### Suggested Walkthrough

1. Click **Connect** (should auto-connect)
2. Tab 1: Click **Deploy Clone** to create App 100
3. Tab 2: Click **Simulate Verification** to verify the default user
4. Tab 3: Click **Check isVerified()** to see the result, then **Explore App Details**
5. Tab 1: Click **Deploy Second App (ID 200)** to create a second app
6. Tab 4: Click **Attempt Sybil** to see the attack blocked, then **Compare Scopes** to see cross-app unlinkability

### Contract Addresses (anvil defaults)

These are deterministic when deploying to a fresh anvil with the default accounts:

| Contract | Address |
|----------|---------|
| Mock Hub V2 | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| SelfVerificationApp (impl) | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| SelfVerificationFactory (proxy) | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` |

### Anvil Accounts Used

| Role | Address | Private Key |
|------|---------|-------------|
| Deployer/Owner | `0xf39Fd6...92266` | `0xac0974...2ff80` |
| Relayer | `0x709979...79C8` | `0x59c699...690d` |
| Alice (user) | `0x3C44Cd...93BC` | anvil #2 |
| Bob (user) | `0x90F79b...3906` | anvil #3 |

## 8. Dev Pitch

**TL;DR for Self devs:**

Self's ZK proofs let users prove things about their identity — age, nationality, OFAC status — without revealing the underlying data. But today, if you want that proof result to be queryable on-chain by other smart contracts, you have to put the full `GenericDiscloseOutputV2` on-chain, which includes PII. The SelfVerificationRegistry fixes this.

The registry is a factory that deploys a minimal proxy clone per app. When a user verifies, Hub V2 validates the ZK proof (same as always), and the clone stores a single boolean: "this address is verified, and the verification expires at time T." No name, no date of birth, no nationality, no document number. Just a yes/no with an expiry.

Any smart contract can then call `factory.isVerified(appId, userAddress)` and get a trustless answer — no oracle, no off-chain API, no trust in anyone's backend. This unlocks real on-chain composability: a DeFi lending protocol gates on age verification, a DAO gates on OFAC clearance, a prediction market gates on proof-of-personhood — all without seeing or storing any PII, and all without trusting anyone except Hub V2 and the ZK circuits (which they already trust).

The contracts are built and tested (33/33 passing). Next steps are relayer integration and widget support for `endpoint-type="celo"`, which will make this available to any developer who already uses the Self verification widget. If you're working on the relayer, the widget, or anything that touches on-chain identity — this is the composability layer that connects them.
