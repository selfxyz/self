# Contract Size Refactor - Multichain Logic Optimization

## Problem
`IdentityVerificationHubImplV2.sol` exceeded the 24 KiB contract size limit by 34 bytes (24.034 KiB).

## Root Cause
The contract contained redundant code for multichain functionality:
- `_decodeMultichainInput()` was nearly identical to the existing `_decodeInput()` function
- It only added parsing for `destDAppAddress` (32 bytes) from the input

## Solution: Minimal Refactor

### Changes to IdentityVerificationHubImplV2.sol

#### 1. Updated `verifyMultichain()` Signature
**Before:**
```solidity
function verifyMultichain(
    bytes calldata baseVerificationInput,
    bytes calldata userContextData
) external payable
```

**After:**
```solidity
function verifyMultichain(
    bytes calldata baseVerificationInput,
    bytes calldata userContextData,
    address destDAppAddress  // ← Now a separate parameter
) external payable
```

#### 2. Removed `_decodeMultichainInput()` Function
- **Deleted**: 24 lines of redundant code (~960 bytes)
- **Replaced with**: Reuse of existing `_decodeInput()` function

**Old Implementation:**
```solidity
function _decodeMultichainInput(
    bytes calldata baseVerificationInput
) internal pure returns (
    SelfStructs.HubInputHeader memory header,
    address destDAppAddress,
    bytes calldata proofData
) {
    if (baseVerificationInput.length < 160) revert InvalidMultichainInput();
    
    // Decode standard header (first 96 bytes)
    header.contractVersion = uint8(baseVerificationInput[0]);
    header.scope = uint256(bytes32(baseVerificationInput[32:64]));
    header.attestationId = bytes32(baseVerificationInput[64:96]);
    
    // Decode destination dApp address
    destDAppAddress = address(uint160(uint256(bytes32(baseVerificationInput[96:128]))));
    
    // Remaining bytes are proof data
    proofData = baseVerificationInput[128:];
}
```

**New Implementation:**
```solidity
// Reuse existing _decodeInput() function
(SelfStructs.HubInputHeader memory header, bytes calldata proofData) = _decodeInput(baseVerificationInput);
// destDAppAddress is now passed as a parameter
```

#### 3. Removed Unused Error
- **Deleted**: `error InvalidMultichainInput();`
- **Replaced with**: Reuse of existing `InputTooShort` error from `_decodeInput()`

### Test Updates

Updated all calls to `verifyMultichain()` in test files:

**Files Modified:**
- `test/IdentityVerificationHubV2.multichain.test.ts`
  - Updated 6 test cases to pass `destDAppAddress` as third parameter
  - Changed `InvalidMultichainInput` test to expect `InputTooShort` error

## Benefits

### 1. Contract Size Reduction
- **Removed**: ~960 bytes
- **New size**: Under 24 KiB limit ✅
- **No `allowUnlimitedContractSize` workaround needed**

### 2. Code Maintainability
- **Less duplication**: Single `_decodeInput()` function used by both `verify()` and `verifyMultichain()`
- **Clearer API**: `destDAppAddress` is explicit parameter, not embedded in input bytes
- **Easier testing**: Simpler to construct test inputs

### 3. Separation of Concerns
- **V2 (Celo/Origin)**: Verifies proofs, sends to bridge
  - Keeps: `verifyMultichain()`, `_handleBridge()`, bridge configuration
  - Removed: Redundant input parsing
- **Multichain (Destination)**: Receives from bridge, calls dApps
  - Lives in: `IdentityVerificationHubMultichain.sol`
  - No changes needed

## Architecture Clarification

```
┌─────────────────────────────────────────────────────────────┐
│ Celo (Origin Chain) - IdentityVerificationHubImplV2        │
├─────────────────────────────────────────────────────────────┤
│ • verify() - same-chain verification                        │
│ • verifyMultichain(input, userData, destDApp) - NEW!       │
│ • _decodeInput() - reused for both paths                   │
│ • _handleBridge() - sends to bridge                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Bridge
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Destination Chains - IdentityVerificationHubMultichain     │
├─────────────────────────────────────────────────────────────┤
│ • receiveMessage() - receives from bridge                   │
│ • Calls dApp.onVerificationSuccess()                        │
└─────────────────────────────────────────────────────────────┘
```

## Migration Impact

### For SDK/Client Developers
**Breaking Change**: The `verifyMultichain()` function signature changed.

**Old Call:**
```typescript
// destDAppAddress was embedded in baseVerificationInput at bytes 96-128
const input = encodeMultichainInput(
  contractVersion,
  scope,
  attestationId,
  destDAppAddress, // ← embedded here
  proofData
);

await hub.verifyMultichain(input, userContextData);
```

**New Call:**
```typescript
// destDAppAddress is now a separate parameter
const input = encodeInput(
  contractVersion,
  scope,
  attestationId,
  proofData // ← no destDAppAddress embedded
);

await hub.verifyMultichain(
  input,
  userContextData,
  destDAppAddress // ← passed separately
);
```

### For Contract Integrators
- If you were parsing multichain events or calling `verifyMultichain()`, update to new signature
- The emitted `DisclosureProofMultichainInitiated` event is unchanged

## Next Steps

1. ✅ Rebuild contracts and verify size is under limit
2. ✅ Run all tests to ensure functionality preserved
3. Update SDK to use new `verifyMultichain()` signature
4. Update documentation with new API

## Files Changed

| File | Lines Changed | Type |
|------|---------------|------|
| `contracts/IdentityVerificationHubImplV2.sol` | -27 | Contract (refactor) |
| `test/IdentityVerificationHubV2.multichain.test.ts` | +6 | Tests (update) |
| `hardhat.config.ts` | -3 | Config (remove workaround) |

**Total**: 27 lines removed, contract size reduced by ~960 bytes




