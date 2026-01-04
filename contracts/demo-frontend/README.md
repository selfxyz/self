# Multichain Demo dApp

A demonstration dApp for multichain verification: Celo → Base via LayerZero.

## Overview

This demo shows:
- QR code generation for multichain disclosure proof
- Nationality disclosure request
- "Bridge Test" message bridging
- Real-time bridge timing tracking
- Verification data display (nationality, message, timestamp)

## Architecture

```
User scans QR → Mobile App → TEE Prover → Relayer → Celo Hub
    → LayerZero → Base MultichainHub → MultichainDemoApp → Frontend polls
```

## Setup

### 1. Install Dependencies

```bash
cd contracts/demo-frontend
yarn install
```

### 2. Deploy the Contract

First, fund the deployer wallet with ETH on Base:
- Deployer: `0x846F1cF04ec494303e4B90440b130bb01913E703`
- Get ETH on Base mainnet

Then deploy:

```bash
cd contracts
npx hardhat run scripts/deploy-multichain-demo.ts --network base
```

### 3. Configure Environment

Create `.env.local` from the example:

```bash
cp .env.local.example .env.local
```

Update with your deployed contract address:

```env
NEXT_PUBLIC_SELF_APP_NAME="Multichain Demo"
NEXT_PUBLIC_SELF_SCOPE_SEED="multichain-demo"
NEXT_PUBLIC_SELF_ENDPOINT=0x<YOUR_DEPLOYED_CONTRACT>
NEXT_PUBLIC_RECEIVER_ADDRESS=0x<YOUR_DEPLOYED_CONTRACT>
NEXT_PUBLIC_BASE_RPC=https://mainnet.base.org
```

### 4. Run the Frontend

```bash
yarn dev
```

Open http://localhost:3000

## Usage

1. Open the demo page in browser
2. Scan the QR code with Self mobile app
3. User must have already registered their passport on Celo
4. Hold the Verify button to generate disclosure proof
5. Wait for LayerZero bridging (timing is tracked)
6. View bridged nationality and message on the verified page

## Contract Details

**MultichainDemoApp** (`contracts/example/MultichainDemoApp.sol`):
- Receives `onVerificationSuccess()` callback from MultichainHub
- Decodes nationality from `GenericDiscloseOutputV2`
- Stores bridged message (userData)
- Records timestamp for timing analysis
- Emits `VerificationReceived` events

## Endpoints

| Endpoint Type | Description |
|---------------|-------------|
| `base` | Celo mainnet → Base mainnet (production) |
| `staging_base` | Celo Sepolia → Base Sepolia (testnet) |

## Requirements

- Node.js 22.x
- Yarn
- Self mobile app (with registered passport)
- Funded deployer wallet on Base

## Links

- [Celo Explorer](https://celoscan.io)
- [LayerZero Scan](https://layerzeroscan.com)
- [Base Explorer](https://basescan.org)


