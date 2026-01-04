# Multichain V6 Testing Guide

## Overview

This document outlines the comprehensive testing strategy for the multichain verification system. Testing is organized into three layers: contract tests, relayer integration tests, and end-to-end tests.

## 1. Contract Tests

### 1.1 Hub Contract Tests (`IdentityVerificationHubImplV2`)

**Location**: `contracts/test/IdentityVerificationHubV2.test.ts`

#### Test Cases for `verifyMultichain()`

1. **Basic Multichain Verification**
   - ✅ Successfully verify proof and emit `DisclosureProofMultichainInitiated` event
   - ✅ Validate message ID generation includes destDAppAddress
   - ✅ Check all event parameters are correct (destChainId, destDAppAddress, configId, etc.)

2. **Input Validation**
   - ✅ Revert if `destChainId == block.chainid` (cannot bridge to same chain)
   - ✅ Revert if `baseVerificationInput` is malformed
   - ✅ Revert if extracted chainId doesn't match embedded destChainId
   - ✅ Revert with `InvalidMultichainInput` for invalid input format

3. **Bridge Configuration**
   - ✅ Revert with `BridgeEndpointNotSet` if bridge endpoint not configured
   - ✅ Revert with `DestinationHubNotSet` if destination hub not set for chain
   - ✅ Validate bridge payload encoding (messageId, destDAppAddress, output, userDataToPass)

4. **Verification Flow**
   - ✅ Proof verification executes correctly (same as `verify()`)
   - ✅ OFAC checks pass/fail appropriately
   - ✅ Age verification works correctly
   - ✅ Forbidden country validation functions

5. **Edge Cases**
   - ✅ Large proof payloads
   - ✅ Maximum length userContextData
   - ✅ Edge destChainId values
   - ✅ Zero address in destDAppAddress

#### Test Cases for `verify()` (Ensure Backwards Compatibility)

1. **Same-Chain Verification (Existing Flow)**
   - ✅ `verify()` works exactly as before for same-chain
   - ✅ `verifySelfProof` on dApp → `verify()` on Hub flow unchanged
   - ✅ Events emitted correctly
   - ✅ Callback to dApp contract succeeds

2. **Multichain Through `verify()` (Old Route - Should Still Work)**
   - ✅ When destChainId != block.chainid in userContextData
   - ✅ Routes to multichain flow correctly
   - ✅ Generates correct messageId (without destDAppAddress)
   - ✅ Emits `DisclosureProofMultichainInitiated` event

### 1.2 Destination Hub Contract Tests (`IdentityVerificationHubMultichain`)

**Location**: `contracts/test/IdentityVerificationHubMultichain.test.ts`

#### Test Cases

1. **Message Reception**
   - ✅ Successfully receive and process bridged message
   - ✅ Extract payload correctly (messageId, destDAppAddress, configId, output, userDataToPass)
   - ✅ Call `onVerificationSuccess` on dApp contract
   - ✅ Emit `VerificationBridged` event

2. **Access Control**
   - ✅ Revert with `UnauthorizedBridgeEndpoint` if caller is not bridge endpoint
   - ✅ Revert with `UntrustedSourceChain` if source chain not trusted
   - ✅ Revert with `UntrustedSourceHub` if source hub not trusted

3. **Validation**
   - ✅ Revert with `InvalidDestinationContract` if destDAppAddress is zero
   - ✅ ConfigId validation (when implemented in dApp contracts)

4. **Admin Functions**
   - ✅ `setBridgeEndpoint()` works correctly (SECURITY_ROLE only)
   - ✅ `setSourceHub()` works correctly (SECURITY_ROLE only)
   - ✅ Non-admin cannot call admin functions

### 1.3 Mock Bridge Provider Tests

**Location**: `contracts/test/MockBridgeProvider.test.ts`

#### Test Cases

1. **Message Sending**
   - ✅ Accept message from Hub
   - ✅ Store message for retrieval
   - ✅ Emit appropriate events

2. **Message Delivery**
   - ✅ Deliver message to destination hub
   - ✅ Handle delivery failures gracefully

## 2. Relayer Integration Tests

### 2.1 Endpoint Type Routing Tests

**Location**: `self-infra/relayer/tests/routing_test.rs`

#### Test Cases

1. **Endpoint Type Detection**
   - ✅ Correctly identify multichain endpoint types (base, staging_base, gnosis, optimism)
   - ✅ Route to `process_multichain_transaction` for multichain types
   - ✅ Route to `process_transaction` for same-chain types (celo, staging_celo)
   - ✅ Route to offchain verification for https types

2. **Multichain Transaction Processing**
   - ✅ Fetch scope from dApp contract
   - ✅ Fetch configId from dApp contract
   - ✅ Build correct multichain baseVerificationInput format
   - ✅ Call `verifyMultichain()` on Hub (not `verifySelfProof` on dApp)

3. **Error Handling**
   - ✅ Handle invalid dApp contract address
   - ✅ Handle dApp contract without `scope()` or `getConfigId()`
   - ✅ Handle RPC failures gracefully
   - ✅ Handle proof verification failures

### 2.2 Input Encoding Tests

**Location**: `self-infra/relayer/tests/encoding_test.rs`

#### Test Cases

1. **BaseVerificationInput Encoding**
   - ✅ Correct format: attestationId | scope | destChainId | destDAppAddress | encodedProof
   - ✅ Each field is 32 bytes as expected
   - ✅ Proof payload appended correctly
   - ✅ Total length matches expectations

2. **Chain ID Mapping**
   - ✅ Correct chain IDs for each endpoint type:
     - base: 8453
     - staging_base: 84532
     - gnosis: 100
     - optimism: 10
     - celo: 42220
     - staging_celo: 11142220

## 3. End-to-End Tests

### 3.1 Full Multichain Flow

**Location**: `tests/e2e/multichain.test.ts`

#### Test Scenario: Base Multichain Verification

1. **Setup**
   - Deploy Hub on Celo Sepolia
   - Deploy Multichain Hub on Base Sepolia
   - Deploy test dApp contract on Base Sepolia
   - Configure bridge endpoints and destination hubs
   - Set up test user with valid passport data

2. **Execution**
   - User scans QR code from dApp with endpoint type "staging_base"
   - Mobile app generates proof
   - App submits proof to db-relayer
   - Relayer fetches dApp scope and configId
   - Relayer calls `verifyMultichain()` on Celo Hub
   - Hub verifies proof
   - Hub calls bridge provider (mock)
   - Bridge delivers message to Base Hub
   - Base Hub calls dApp `onVerificationSuccess()`

3. **Verification**
   - ✅ `DisclosureProofMultichainInitiated` event emitted on Celo
   - ✅ Message sent to bridge with correct payload
   - ✅ `VerificationBridged` event emitted on Base
   - ✅ dApp receives correct output and userDataToPass
   - ✅ Mobile app shows success status
   - ✅ Database records multichain status correctly

#### Test Scenario: Backwards Compatibility (Same-Chain)

1. **Setup**
   - Same as above but dApp on Celo

2. **Execution**
   - User scans QR code with endpoint type "staging_celo"
   - Mobile app generates proof
   - App submits to db-relayer
   - Relayer calls `verifySelfProof()` on dApp (OLD FLOW)
   - dApp calls `verify()` on Hub
   - Hub calls back to dApp

3. **Verification**
   - ✅ Old flow works exactly as before
   - ✅ `DisclosureVerified` event emitted (not multichain event)
   - ✅ No bridge interaction
   - ✅ dApp receives callback immediately

### 3.2 Error Scenarios

#### Test Scenario: Invalid Configuration

1. **Bridge Endpoint Not Set**
   - ✅ Transaction reverts with `BridgeEndpointNotSet`
   - ✅ User sees appropriate error message

2. **Destination Hub Not Set**
   - ✅ Transaction reverts with `DestinationHubNotSet`
   - ✅ User sees appropriate error message

3. **Same Chain Multichain Attempt**
   - ✅ Transaction reverts with `CannotBridgeToCurrentChain`
   - ✅ User sees appropriate error message

#### Test Scenario: Proof Verification Failures

1. **Invalid Proof**
   - ✅ Verification fails as expected
   - ✅ No bridge message sent
   - ✅ User sees proof verification error

2. **OFAC Sanctions Match**
   - ✅ Verification fails with OFAC error
   - ✅ No bridge message sent
   - ✅ User sees compliance error

3. **Age Verification Failure**
   - ✅ Verification fails with age error
   - ✅ No bridge message sent
   - ✅ User sees age requirement error

### 3.3 Performance Tests

**Location**: `tests/e2e/performance.test.ts`

#### Test Cases

1. **Latency**
   - ✅ Measure time from proof submission to bridge message sent
   - ✅ Compare multichain vs same-chain latency
   - ✅ Ensure < 10s for proof verification

2. **Gas Costs**
   - ✅ Measure gas for `verifyMultichain()` call
   - ✅ Compare to `verify()` gas cost
   - ✅ Ensure within acceptable limits

3. **Throughput**
   - ✅ Submit multiple multichain verifications concurrently
   - ✅ Verify all succeed
   - ✅ Check for resource contention

## 4. Database Tests

### 4.1 Multichain Verifications Table

**Location**: `self-infra/db-relayer/tests/db_test.rs`

#### Test Cases

1. **Record Creation**
   - ✅ Insert multichain verification record
   - ✅ Validate all fields stored correctly
   - ✅ Check default status is 'pending'

2. **Status Updates**
   - ✅ Update status through workflow: pending → verifying → verified → bridging → bridged → completed
   - ✅ Store transaction hashes at each step
   - ✅ Update timestamps correctly

3. **Queries**
   - ✅ Query by session_id
   - ✅ Query by message_id
   - ✅ Query by status
   - ✅ Query by destination chain
   - ✅ Query by user_identifier

4. **Error Handling**
   - ✅ Store error codes and messages
   - ✅ Mark as 'failed' status appropriately
   - ✅ Query failed verifications for debugging

## 5. Test Execution Commands

### Contract Tests
```bash
cd contracts
yarn test
yarn test:coverage
```

### Relayer Tests
```bash
cd self-infra/relayer
cargo test
cargo test --release
```

### E2E Tests
```bash
cd tests/e2e
yarn test
yarn test:multichain  # Run only multichain tests
```

### Database Tests
```bash
cd self-infra/db-relayer
cargo test
```

## 6. Test Data

### Sample Test Addresses

- **Celo Hub (Sepolia)**: `0x...` (from deployed_addresses.json)
- **Base Multichain Hub (Sepolia)**: `0x...` (to be deployed)
- **Test dApp (Base Sepolia)**: `0x...` (to be deployed)
- **Mock Bridge Endpoint**: `0x...` (deployed with tests)

### Sample Test Proofs

- **Valid Passport Proof**: See `tests/fixtures/valid_passport_proof.json`
- **Valid EU ID Proof**: See `tests/fixtures/valid_eu_id_proof.json`
- **Invalid Proof**: See `tests/fixtures/invalid_proof.json`

### Sample Test Users

- **User 1**: Valid passport, no sanctions, age > 18
- **User 2**: Valid passport, on OFAC list
- **User 3**: Valid passport, age < 18 (for age verification tests)

## 7. Continuous Integration

### GitHub Actions Workflow

**Location**: `.github/workflows/multichain-tests.yml`

#### Test Matrix

- Contract tests on every PR
- Relayer tests on every PR
- E2E tests on main branch and release tags
- Database tests on db-relayer changes

#### Test Requirements for Merge

- ✅ All contract tests pass
- ✅ All relayer tests pass
- ✅ No linting errors
- ✅ Code coverage > 80% for new code

## 8. Known Issues and Limitations

### Current Limitations

1. **Bridge Integration**: Mock bridge provider used until LayerZero/Wormhole integration (Commit 8)
2. **ConfigId Validation**: Not enforced on destination chain until dApp contracts updated
3. **Gas Estimation**: Bridge fee estimation not yet implemented
4. **Retry Logic**: Multichain verification retry not yet implemented

### Future Enhancements

1. Add retry mechanism for failed bridge messages
2. Implement gas estimation for bridge fees
3. Add monitoring and alerting for multichain failures
4. Add integration tests with real bridge providers (testnet)

## 9. Testing Checklist

Before marking multichain implementation as complete:

- [ ] All contract test cases pass
- [ ] All relayer test cases pass
- [ ] E2E happy path test passes
- [ ] E2E error scenarios tested
- [ ] Backwards compatibility verified (same-chain still works)
- [ ] Database schema tested
- [ ] Performance benchmarks meet requirements
- [ ] Documentation updated
- [ ] CI/CD pipeline configured
- [ ] Test coverage > 80%

## 10. Manual Testing Guide

### Setup Local Test Environment

1. **Start Local Celo Node**
   ```bash
   anvil --chain-id 11142220
   ```

2. **Deploy Contracts**
   ```bash
   cd contracts
   yarn deploy:hub:v2
   yarn deploy:test:selfverificationroot
   ```

3. **Start Relayer**
   ```bash
   cd self-infra/relayer
   cargo run
   ```

4. **Start DB Relayer**
   ```bash
   cd self-infra/db-relayer
   cargo run
   ```

### Manual Test Flow

1. **Generate Test Proof**
   - Use mock passport data
   - Generate proof with TEE prover

2. **Submit to Relayer**
   ```bash
   curl -X POST http://localhost:8080/transaction \
     -H "Content-Type: application/json" \
     -d @test_multichain_request.json
   ```

3. **Monitor Logs**
   - Check relayer logs for "Multichain" events
   - Check Hub contract events on Celo
   - Check Base Hub contract events

4. **Verify Database**
   ```sql
   SELECT * FROM multichain_verifications WHERE session_id = '...';
   ```

5. **Check dApp Callback**
   - Verify dApp received `onVerificationSuccess` call
   - Check output and userDataToPass parameters

---

**Note**: This testing guide will be updated as the implementation progresses and new test requirements are identified.
