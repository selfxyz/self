# E2E Testing - Deployment Requirements

## 🎯 Overview

For full end-to-end multichain testing, you need to deploy contracts and services to testnets. This document outlines what needs to be deployed and in what order.

## 📋 Deployment Checklist

### Phase 1: Core Infrastructure (Celo Sepolia) ✅

#### 1.1 Deploy Hub V2 on Celo Sepolia
**Contract**: `IdentityVerificationHubImplV2.sol`
**Network**: Celo Sepolia (Chain ID: 11142220)
**RPC**: `https://celo-sepolia.drpc.org`

```bash
cd /Users/evinova/Documents/self/contracts

# Set environment variables
export NETWORK=celo-sepolia
export PRIVATE_KEY=<your-deployer-private-key>
export VERIFY=--verify  # Optional: verify on block explorer

# Deploy Hub V2
yarn deploy:hub:v2

# Note the deployed Hub V2 address
# e.g., 0x1234...abcd
```

**Required Configuration**:
- Set circuit verifiers (Register, DSC, Disclose)
- Set registries for each attestation type
- Configure OFAC Merkle roots
- Set admin roles

#### 1.2 Deploy Identity Registries
**Required for**: Commitment storage

```bash
# Deploy passport registry
yarn deploy:registry

# Deploy ID card registry
yarn deploy:registry:idcard

# Note addresses for Hub configuration
```

#### 1.3 Deploy Circuit Verifiers
**Required for**: Proof verification

```bash
# Deploy all verifiers (Register, DSC, VC+Disclose)
yarn deploy:verifiers:all

# Note addresses for Hub configuration
```

#### 1.4 Configure Hub V2
**After all deployments**:

```typescript
// Configure registries
await hub.setRegistry(PASSPORT_ATTESTATION_ID, passportRegistryAddress);
await hub.setRegistry(ID_CARD_ATTESTATION_ID, idCardRegistryAddress);

// Configure verifiers
await hub.setRegisterCircuitVerifier(attestationId, typeId, verifierAddress);
await hub.setDscCircuitVerifier(attestationId, typeId, verifierAddress);
await hub.setDiscloseVerifier(attestationId, verifierAddress);

// Configure OFAC (if applicable)
await hub.updateOFACMerkleRoot(merkleRoot);
```

### Phase 2: Destination Chain (Base Sepolia) ✅

#### 2.1 Deploy Multichain Hub on Base Sepolia
**Contract**: `IdentityVerificationHubMultichain.sol`
**Network**: Base Sepolia (Chain ID: 84532)
**RPC**: `https://sepolia.base.org`

```bash
cd /Users/evinova/Documents/self/contracts

export NETWORK=base-sepolia
export PRIVATE_KEY=<your-deployer-private-key>

# Deploy multichain hub (create deployment script first)
npx hardhat ignition deploy ignition/modules/deployMultichainHub.ts \
  --network base-sepolia --verify
```

**Configuration**:
```typescript
// Configure source chains
await multichainHub.setSourceHub(
  11142220,  // Celo Sepolia
  ethers.zeroPadValue(celoHubAddress, 32)
);

await multichainHub.setSourceHub(
  42220,  // Celo Mainnet (for future)
  ethers.zeroPadValue(celoMainnetHubAddress, 32)
);

// Set bridge endpoint (mock for now)
await multichainHub.setBridgeEndpoint(mockBridgeAddress);
```

#### 2.2 Deploy Test dApp Contract on Base
**For**: Testing callback reception

```bash
# Deploy test dApp that implements ISelfVerificationRoot
yarn deploy:test:selfverificationroot

# Note the dApp address for testing
# e.g., 0x5678...efgh
```

**Required Interface**:
```solidity
interface ISelfVerificationRoot {
  function onVerificationSuccess(
    bytes calldata output,
    bytes calldata userData
  ) external;

  function scope() external view returns (uint256);
  function getConfigId() external view returns (bytes32);
}
```

### Phase 3: Bridge Configuration ✅

#### 3.1 Deploy Mock Bridge Provider
**For**: Testing without real bridge integration

**Location**: `contracts/contracts/test/MockBridgeProvider.sol`

```bash
cd /Users/evinova/Documents/self/contracts

# Deploy on Celo Sepolia
npx hardhat run scripts/deployMockBridge.ts --network celo-sepolia

# Deploy on Base Sepolia
npx hardhat run scripts/deployMockBridge.ts --network base-sepolia
```

#### 3.2 Configure Bridge on Hub V2 (Celo)
```typescript
// Set bridge endpoint
await hubV2.setBridgeEndpoint(mockBridgeAddress);

// Set destination hubs
await hubV2.setDestinationHub(
  84532,  // Base Sepolia
  ethers.zeroPadValue(baseMultichainHubAddress, 32)
);

// Optional: Set bridge chain IDs (for LayerZero/Wormhole)
await hubV2.setDestinationBridgeChainId(84532, 10245);  // Example LZ endpoint ID
```

#### 3.3 Test Bridge Connection
**Script**: Create a test script to verify bridge setup

```typescript
// Test bridge message flow
const tx = await mockBridge.sendTestMessage(
  84532,  // dest chain
  baseMultichainHubAddress,
  testPayload
);

// Verify message received on Base
const received = await baseMultichainHub.lastMessage();
```

### Phase 4: Backend Services ✅

#### 4.1 Deploy Updated Relayer
**Location**: `self-infra/relayer`

**Requirements**:
- Updated code with multichain routing
- Updated ABIs with `verifyMultichain()`, `scope()`, `getConfigId()`
- Environment variables configured

```bash
cd /Users/evinova/Documents/self-infra/relayer

# Build
cargo build --release

# Set environment variables
export CELO_RPC_URL=https://celo-sepolia.drpc.org
export HUB_V2_ADDRESS=<deployed-hub-address>
export THIRDWEB_ENGINE_URL=<engine-url>
export THIRDWEB_BACKEND_WALLET=<wallet-address>

# Run
./target/release/relayer
```

**Configuration File** (`config.json`):
```json
{
  "celo_rpc_url": "https://celo-sepolia.drpc.org",
  "identity_verification_hub_v2_address": "0x...",
  "base_rpc_url": "https://sepolia.base.org",
  "disclose_gas_limit": "5000000",
  "from_addresses": ["0x..."]
}
```

#### 4.2 Update db-relayer with WebSocket Support
**Location**: `self-infra/db-relayer`

**Required Changes**:
- Apply database migration for `multichain_verifications` table
- Update WebSocket emission to include multichain status
- Add multichain status tracking logic

```bash
cd /Users/evinova/Documents/self-infra/db-relayer

# Apply migration
psql -d relayer_db -f ../db_relayer_migration.sql

# Build and run
cargo build --release
./target/release/db-relayer
```

**Database Connection**:
```bash
export DATABASE_URL=postgresql://user:pass@localhost:5432/relayer_db
```

### Phase 5: Mobile App (Optional for E2E) ⏳

#### 5.1 Update Mobile App
**Required for full UX testing**:

```bash
cd /Users/evinova/Documents/self/app

# Install dependencies
yarn install

# Build for testing
yarn ios  # or yarn android
```

**Changes Needed** (see MOBILE_APP_MULTICHAIN_REQUIREMENTS.md):
1. WebSocket multichain status handling
2. Database multichain status updates
3. Display MultichainProgress component

**Can Skip For**: Contract-level E2E testing (without mobile app)

## 🧪 E2E Test Scenarios

### Scenario 1: Contract-Only E2E (No Mobile App)
**Requirements**:
- ✅ Contracts deployed (Celo + Base)
- ✅ Mock bridge deployed
- ✅ Test dApp deployed
- ❌ Relayer not required
- ❌ db-relayer not required
- ❌ Mobile app not required

**Test Method**: Direct smart contract calls

```typescript
// Generate proof offchain
const proof = await generateTestProof();

// Call verifyMultichain directly
const tx = await hubV2.verifyMultichain(
  baseVerificationInput,
  userContextData,
  { value: ethers.parseEther("0.01") }
);

// Verify event emitted
const events = await hubV2.queryFilter("DisclosureProofMultichainInitiated");

// Manually trigger bridge (mock)
await mockBridge.deliverMessage(
  baseMultichainHub.address,
  messagePayload
);

// Verify dApp callback
const dAppCallback = await testDApp.lastCallback();
expect(dAppCallback.output).to.equal(expectedOutput);
```

### Scenario 2: Full Stack E2E (With Relayer, No Mobile)
**Requirements**:
- ✅ Contracts deployed (Celo + Base)
- ✅ Mock bridge deployed
- ✅ Test dApp deployed
- ✅ Relayer deployed
- ✅ db-relayer deployed
- ❌ Mobile app not required

**Test Method**: API calls to relayer

```bash
# Submit verification request to relayer
curl -X POST http://relayer-url:8080/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-123",
    "proof": {...},
    "public_inputs": [...],
    "circuit_name": "vc_and_disclose",
    "onchain": true,
    "proof_type": "disclose",
    "endpoint_type": "staging_base",
    "endpoint": "0x5678...efgh",
    "version": 2,
    "user_defined_data": "0x..."
  }'

# Monitor WebSocket for status updates
# Subscribe to sessionId "test-123"

# Verify multichain flow completed
```

### Scenario 3: Complete E2E (With Mobile App)
**Requirements**:
- ✅ Everything from Scenario 2
- ✅ Mobile app built and running

**Test Method**: Mobile app QR scan

1. dApp generates QR code with `endpointType: 'staging_base'`
2. Mobile app scans QR code
3. User verifies with passport
4. App generates proof
5. App submits to relayer
6. Monitor status on mobile app
7. Verify completion on dApp website

## 📦 Minimal Deployment for Testing

### Quick Start (Contract-Only)
**Time**: ~30 minutes
**Cost**: ~0.1 CELO + 0.001 ETH (testnet faucets)

**Steps**:
1. Deploy Hub V2 on Celo Sepolia
2. Deploy IdentityVerificationHubMultichain on Base Sepolia
3. Deploy MockBridgeProvider on both chains
4. Deploy test dApp on Base Sepolia
5. Configure bridge endpoints
6. Run contract tests

### Full Stack (No Mobile)
**Time**: ~2 hours
**Cost**: Same as above + server hosting

**Additional Steps**:
7. Deploy relayer service
8. Deploy db-relayer service
9. Set up database
10. Configure environment variables
11. Test via API calls

### Complete (With Mobile)
**Time**: ~4 hours
**Cost**: Same as above

**Additional Steps**:
12. Update mobile app code
13. Build mobile app
14. Test full user flow

## 🔑 Required Resources

### Testnet Tokens
- **Celo Sepolia**: Get from [Celo Faucet](https://faucet.celo.org)
- **Base Sepolia**: Get from [Base Faucet](https://sepolia.base.org/faucet)

### Private Keys
- Deployer account (funded with testnet tokens)
- Relayer account (for submitting transactions)
- Test user accounts

### RPC URLs
- Celo Sepolia: `https://celo-sepolia.drpc.org`
- Base Sepolia: `https://sepolia.base.org`

### Infrastructure
- Database (PostgreSQL) for db-relayer
- Server for relayer service
- Server for db-relayer service

## 📊 Deployment Costs (Testnet)

### Smart Contracts
- Hub V2: ~0.05 CELO (free testnet)
- Multichain Hub: ~0.001 ETH (free testnet)
- Mock Bridge: ~0.001 CELO + 0.001 ETH
- Test dApp: ~0.0005 ETH

### Operations
- Verification transaction: ~0.002 CELO
- Bridge message (mock): ~0.001 ETH
- Total per test: ~0.003 CELO + 0.001 ETH

## ✅ Verification Checklist

After deployment, verify:

### Contracts
- [ ] Hub V2 deployed and initialized
- [ ] Multichain Hub deployed and initialized
- [ ] Bridge endpoints configured
- [ ] Destination hubs set
- [ ] Test dApp deployed with correct interface
- [ ] Admin roles assigned correctly

### Services
- [ ] Relayer connects to RPC
- [ ] Relayer can fetch dApp scope and configId
- [ ] db-relayer connects to database
- [ ] WebSocket server running
- [ ] Database migration applied

### Integration
- [ ] Relayer can submit to Hub V2
- [ ] Hub V2 can call bridge
- [ ] Bridge can deliver to Multichain Hub
- [ ] Multichain Hub can call dApp
- [ ] dApp receives correct output

## 🎯 Recommended Testing Approach

### Phase 1: Contract Unit Tests (Local)
```bash
cd contracts
yarn test
```
**Time**: 10 minutes
**Deploy**: None
**Coverage**: Core logic

### Phase 2: Contract Integration (Testnet)
**Time**: 2 hours
**Deploy**: Contracts only
**Coverage**: Contract interactions

### Phase 3: Full Stack (Testnet)
**Time**: 4 hours
**Deploy**: Contracts + Services
**Coverage**: End-to-end flow

---

**Last Updated**: December 16, 2025
**Status**: Ready for deployment planning
