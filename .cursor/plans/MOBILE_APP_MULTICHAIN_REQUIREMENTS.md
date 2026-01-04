# Mobile App - Multichain Requirements

## ✅ What Already Exists (No Changes Needed)

### 1. MultichainStatus Types
**Location**: `app/src/stores/proofTypes.ts:50-69`

```typescript
export interface MultichainStatus {
  isMultichain: boolean;
  destChainId?: number;
  destChainName?: string;
  origin: ChainStatus;      // Celo verification
  bridge: BridgeStatus;     // Bridge transfer
  destination: ChainStatus; // Destination chain delivery
}

export interface ChainStatus {
  status: 'pending' | 'complete' | 'failed';
  txHash?: string;
}

export interface BridgeStatus {
  status: 'pending' | 'in_progress' | 'complete' | 'failed';
  protocol?: 'layerzero' | 'wormhole';
  detail?: string;
  eta?: string;
}
```

### 2. MultichainProgress UI Component
**Location**: `app/src/components/MultichainProgress.tsx:119-251`

**Features**:
- ✅ 3-step progress indicator (Celo → Bridge → Delivered)
- ✅ Transaction hash display for each step
- ✅ Bridge protocol badge (LayerZero/Wormhole)
- ✅ ETA and detail text support
- ✅ Error state handling
- ✅ Visual step indicators with colors

### 3. WebSocket Infrastructure
**Location**: `app/src/stores/proofHistoryStore.ts:57-85`

**Features**:
- ✅ WebSocket connection to db-relayer
- ✅ Status update subscription by sessionId
- ✅ Status code handling (3=FAILURE, 4=SUCCESS, 5=FAILURE)
- ✅ Automatic reconnection and throttling

### 4. Database Storage
**Location**: `app/src/stores/database.ts`

**Features**:
- ✅ `multichain` field in ProofHistory table
- ✅ Stores MultichainStatus object
- ✅ Query support for multichain proofs

## 🔧 What Needs to Be Implemented

### 1. Enhanced WebSocket Status Messages ⚠️

**Current**: Simple status codes (3, 4, 5)
**Needed**: Multichain-specific status updates with granular progress

**Location**: `app/src/stores/proofHistoryStore.ts:73-85`

**Required Changes**:
```typescript
// CURRENT - Simple status handling
websocket.on('status', message => {
  const data = typeof message === 'string' ? JSON.parse(message) : message;

  if (data.status === 3) {
    get().updateProofStatus(data.request_id, ProofStatus.FAILURE);
  } else if (data.status === 4) {
    get().updateProofStatus(data.request_id, ProofStatus.SUCCESS);
  } else if (data.status === 5) {
    get().updateProofStatus(data.request_id, ProofStatus.FAILURE);
  }
});

// NEEDED - Multichain status handling
websocket.on('status', message => {
  const data = typeof message === 'string' ? JSON.parse(message) : message;

  // Handle standard status codes
  if (data.status === 3 || data.status === 5) {
    get().updateProofStatus(data.request_id, ProofStatus.FAILURE);
  } else if (data.status === 4) {
    get().updateProofStatus(data.request_id, ProofStatus.SUCCESS);
  }

  // Handle multichain-specific updates
  if (data.multichain_status) {
    get().updateMultichainStatus(data.request_id, {
      isMultichain: true,
      destChainId: data.dest_chain_id,
      destChainName: data.dest_chain_name,
      origin: {
        status: data.multichain_status.origin_status,
        txHash: data.multichain_status.origin_tx_hash,
      },
      bridge: {
        status: data.multichain_status.bridge_status,
        protocol: data.multichain_status.bridge_protocol,
        detail: data.multichain_status.bridge_detail,
        eta: data.multichain_status.bridge_eta,
      },
      destination: {
        status: data.multichain_status.destination_status,
        txHash: data.multichain_status.destination_tx_hash,
      },
    });
  }
});
```

### 2. Database Update Functions ⚠️

**Location**: `app/src/stores/database.ts`

**Add New Function**:
```typescript
async updateMultichainStatus(
  sessionId: string,
  multichainStatus: MultichainStatus
) {
  const db = await openDatabase();

  await db.executeSql(
    `UPDATE ${TABLE_NAME}
     SET multichain = ?
     WHERE sessionId = ?`,
    [JSON.stringify(multichainStatus), sessionId]
  );
}
```

**Add to ProofDB Interface**:
```typescript
export interface ProofDB {
  // ... existing methods
  updateMultichainStatus: (
    sessionId: string,
    multichainStatus: MultichainStatus
  ) => Promise<void>;
}
```

### 3. Status Screen Integration ⚠️

**Location**: `app/src/screens/verification/ProofRequestStatusScreen.tsx`

**Required Changes**:
Display `MultichainProgress` component when verification is multichain:

```typescript
// Add import
import { MultichainProgress } from '@/components/MultichainProgress';

// In the render section, after the animation:
{/* Show multichain progress for multichain requests */}
{selfApp?.endpointType &&
 isMultichainEndpoint(selfApp.endpointType) &&
 multichainStatus && (
  <MultichainProgress status={multichainStatus} />
)}
```

**Helper Function**:
```typescript
function isMultichainEndpoint(endpointType: EndpointType): boolean {
  return ['base', 'staging_base', 'gnosis', 'optimism'].includes(endpointType);
}
```

### 4. ProofHistoryStore Updates ⚠️

**Location**: `app/src/stores/proofHistoryStore.ts`

**Add Method**:
```typescript
updateMultichainStatus: async (sessionId: string, status: MultichainStatus) => {
  await database.updateMultichainStatus(sessionId, status);

  // Update in-memory state
  set(state => ({
    proofHistory: state.proofHistory.map(proof =>
      proof.sessionId === sessionId
        ? { ...proof, multichain: status }
        : proof
    ),
  }));
}
```

## 📡 db-relayer WebSocket Messages

### Current Message Format
```json
{
  "request_id": "session-123",
  "status": 4,  // 3=FAILURE, 4=SUCCESS, 5=FAILURE
  "reason": "optional error message",
  "error_code": "optional error code"
}
```

### New Multichain Message Format
```json
{
  "request_id": "session-123",
  "status": 2,  // New: 2=IN_PROGRESS (for multichain)
  "dest_chain_id": 8453,
  "dest_chain_name": "Base",
  "multichain_status": {
    "origin_status": "complete",
    "origin_tx_hash": "0xabc...",
    "bridge_status": "in_progress",
    "bridge_protocol": "layerzero",
    "bridge_detail": "Message sent to bridge",
    "bridge_eta": "~2 minutes",
    "destination_status": "pending",
    "destination_tx_hash": null
  }
}
```

### Status Update Sequence

1. **Verification Started**:
```json
{
  "request_id": "session-123",
  "status": 1,  // PROCESSING
  "multichain_status": {
    "origin_status": "pending",
    "bridge_status": "pending",
    "destination_status": "pending"
  }
}
```

2. **Celo Verification Complete**:
```json
{
  "request_id": "session-123",
  "status": 2,  // IN_PROGRESS
  "multichain_status": {
    "origin_status": "complete",
    "origin_tx_hash": "0xabc...",
    "bridge_status": "pending",
    "destination_status": "pending"
  }
}
```

3. **Bridge In Progress**:
```json
{
  "request_id": "session-123",
  "status": 2,
  "multichain_status": {
    "origin_status": "complete",
    "origin_tx_hash": "0xabc...",
    "bridge_status": "in_progress",
    "bridge_protocol": "layerzero",
    "bridge_eta": "~2 minutes",
    "destination_status": "pending"
  }
}
```

4. **Delivered to Destination**:
```json
{
  "request_id": "session-123",
  "status": 4,  // SUCCESS
  "multichain_status": {
    "origin_status": "complete",
    "origin_tx_hash": "0xabc...",
    "bridge_status": "complete",
    "bridge_protocol": "layerzero",
    "destination_status": "complete",
    "destination_tx_hash": "0xdef..."
  }
}
```

## 🎯 Implementation Priority

### High Priority (Required for E2E)
1. ✅ Types already exist
2. ✅ UI component already exists
3. ⚠️ **WebSocket message handling** - Update status listener
4. ⚠️ **Database updates** - Add multichain status update function
5. ⚠️ **Status screen integration** - Show MultichainProgress component

### Medium Priority (Enhanced UX)
6. ⏳ History screen - Show multichain badge in proof list
7. ⏳ Details screen - Expand multichain status details
8. ⏳ Error handling - Multichain-specific error messages

### Low Priority (Future)
9. ⏳ Push notifications - Bridge completion alerts
10. ⏳ Analytics - Track multichain success rates
11. ⏳ Retry mechanism - UI for retrying failed bridge

## 📝 Implementation Summary

**Estimated Work**: ~2-3 hours

**Files to Modify**:
1. `app/src/stores/proofHistoryStore.ts` - Add multichain status handling
2. `app/src/stores/database.ts` - Add update function
3. `app/src/screens/verification/ProofRequestStatusScreen.tsx` - Display progress
4. `app/src/stores/proofTypes.ts` - Already complete ✅
5. `app/src/components/MultichainProgress.tsx` - Already complete ✅

**No Breaking Changes**: All additions are backwards compatible with existing same-chain flow.

**Testing Requirements**:
- Unit tests for status updates
- Integration test with mock WebSocket
- E2E test with full multichain flow (requires deployment)
