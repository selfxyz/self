# SelfVerificationRegistry Demo

Interactive demo showing the SelfVerificationRegistry — on-chain boolean identity verification with zero PII leakage.

## What This Demonstrates

- **Factory + Clone pattern**: EIP-1167 minimal proxies deployed per app, each with a unique Poseidon scope
- **Full verification flow**: passport scan (mocked) -> ZK proof -> Hub V2 callback -> boolean stored on-chain
- **Privacy guarantees**: no PII on-chain, cross-app nullifier unlinkability
- **Sybil resistance**: one passport = one verification per app (DuplicateNullifier revert)
- **Trustless queries**: any contract calls `factory.isVerified(appId, user)`

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (forge + anvil)
- A browser

## Quick Start

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

## What the Deploy Script Does

`DemoSelfVerification.s.sol` runs 6 phases on local anvil:

1. **Deploy** — MockHubV2, SelfVerificationApp (implementation), SelfVerificationFactory (behind UUPS proxy)
2. **Create 2 apps** — App 1 "DemoApp Simple" and App 2 "DemoApp OFAC+Age" (with age > 18 and OFAC enabled)
3. **Verify Alice** on App 1 — full `verifySelfProof()` flow with mock Hub callback
4. **Cross-app isolation** — verify Alice on App 2, show both apps have different clone addresses and scopes
5. **Verify Bob** on App 1 — second user with different nullifier
6. **Sybil test** — attempt to verify a different wallet with Alice's nullifier, confirm it reverts

## Using the Demo Page

The demo has 4 tabs:

| Tab | What it does |
|-----|-------------|
| **1. Create App** | Deploy a new EIP-1167 clone via the factory. Shows clone address and gas cost. |
| **2. Verify User** | Simulate a passport verification. Configures mock Hub, calls `verifySelfProof()`, shows stored result with expiry. |
| **3. Query** | Call `factory.isVerified(appId, user)` and explore app details (scope, config, etc.). Includes a Solidity integration example. |
| **4. Sybil Test** | Attempt a sybil attack (different wallet, same nullifier) and see the `DuplicateNullifier` revert. Compare scopes across apps. |

### Suggested walkthrough

1. Click **Connect** (should auto-connect)
2. Tab 1: Click **Deploy Clone** to create App 100
3. Tab 2: Click **Simulate Verification** to verify the default user
4. Tab 3: Click **Check isVerified()** to see the result, then **Explore App Details**
5. Tab 1: Click **Deploy Second App (ID 200)** to create a second app
6. Tab 4: Click **Attempt Sybil** to see the attack blocked, then **Compare Scopes** to see cross-app unlinkability

## Contract Addresses (anvil defaults)

These are deterministic when deploying to a fresh anvil with the default accounts:

| Contract | Address |
|----------|---------|
| Mock Hub V2 | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| SelfVerificationApp (impl) | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| SelfVerificationFactory (proxy) | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` |

## Anvil Accounts Used

| Role | Address | Private Key |
|------|---------|-------------|
| Deployer/Owner | `0xf39Fd6...92266` | `0xac0974...2ff80` |
| Relayer | `0x709979...79C8` | `0x59c699...690d` |
| Alice (user) | `0x3C44Cd...93BC` | anvil #2 |
| Bob (user) | `0x90F79b...3906` | anvil #3 |

## Architecture Summary

```
Developer                     Factory                  Clone (per app)        Hub V2
    |                            |                          |                   |
    |-- register via HTTP API -->|                          |                   |
    |                            |                          |                   |
    |  createApp(appId, config)  |                          |                   |
    |--------------------------->| -- deploy EIP-1167 ----->|                   |
    |                            |    initialize(scope) --->|                   |
    |                            |                          |-- setConfig() --->|
    |                            |                          |                   |
User scans passport              |                          |                   |
    | verifySelfProof(proof) ----|------------------------->|                   |
    |                            |                          |-- verify(proof) ->|
    |                            |                          |<- callback -------|
    |                            |                          |                   |
    |                            |  Store: verified[user] = {verifiedAt, expiresAt}
    |                            |  Store: nullifier[N] = user
    |                            |                          |                   |
Any contract:                    |                          |                   |
  factory.isVerified(appId, user) --> clone.isVerified(user) --> true/false
```

## Key Design Decisions

- **Why clones?** Each clone = unique address = unique `Poseidon(addr, seed)` scope = different nullifiers per app. Without this, the same user would have the same nullifier across all apps (cross-app linkable).
- **Why a mock Hub?** The real Hub V2 requires actual ZK proofs from a passport NFC scan. The mock simulates the `verify() -> onVerificationSuccess()` callback so you can demo the full flow without hardware.
- **Why relayer-gated?** Developers shouldn't need wallets or gas. The relayer deploys clones and submits verifications on behalf of users.
- **Why expiry?** `expiresAt = min(passportExpiry, now + maxProofAge)`. Stale verifications auto-expire. Handles OFAC staleness. Users can re-verify (same nullifier, same wallet = allowed).
