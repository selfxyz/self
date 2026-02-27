# Contracts — Claude Code Instructions

See `README.md` for integration guide and deployment commands.
See `UPGRADE_GUIDE.md` for the full upgrade workflow.

## Critical Gotchas — Celo + Hardhat

### Hardhat Provider Returns Stale ERC1967 Storage on Celo

`ethers.provider.getStorage(proxy, ERC1967_SLOT)` returns wrong/stale data on Celo. This causes `onlyProxy` modifier checks to appear to fail during `staticCall`/`estimateGas`.

**Workaround:** Pass explicit `{ gasLimit: 200000 }` on all `onlyProxy` function calls. This bypasses the gas estimation step that triggers the stale storage read. On-chain execution works correctly — only the estimate is broken.

### OZ Upgrades Plugin Manifest

`.openzeppelin/celo.json` can become stale from failed deployments. `upgrades.deployProxy` may reuse cached implementations incorrectly. If the manifest is corrupt, back it up and delete it to start fresh. Prefer Ignition over `upgrades.deployProxy` for production deploys.

### Celo RPC Reliability

`celo.drpc.org` is unreliable for deploy confirmations ("Unknown block" errors). Use Alchemy — set `CELO_RPC_URL` in `.env`.

### IdentityRegistryAadhaarImplV1.initialize Bug

`initialize(address _hub)` contains `_hub = _hub;` — the parameter shadows the state variable. Hub is **not** set during initialization. Always call `updateHub()` separately after deploying the Aadhaar registry.

## Governance Addresses (Celo Mainnet)

- Security multisig (SECURITY_ROLE): `0x738f0bb37FD3b6C4Cdf8eb6FcdFaAA0CA208CB4A` — 3/5
- Operations multisig (OPERATIONS_ROLE): `0x067b18e09A10Fa03d027c1D60A098CEbbE5637f0` — 2/5
- Safe TX service: `https://safe-transaction-celo.safe.global/api`
