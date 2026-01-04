# Mobile App: Multichain Implementation Guide

## Overview

This guide details how to integrate multichain verification tracking into the mobile app.
The mobile app needs to:
1. Display multichain progress UI during verification
2. Provide bridge explorer links for users to track their transactions
3. Handle WebSocket updates for real-time bridge status
4. Update local database with multichain status

## Files Modified

### 1. New Utility File ✅ CREATED
- `app/src/utils/bridgeExplorers.ts` - Bridge explorer URL generation

### 2. WebSocket Listener Updates (TODO)
- `app/src/services/websocket.ts` - Add multichain status update handlers

### 3. Database Integration (TODO)
- `app/src/services/database.ts` - Update proof insertion/updates to handle multichain fields
- `app/src/stores/proofTypes.ts` - ✅ ALREADY HAS MultichainStatus types

### 4. UI Components (TODO)
- `app/src/components/MultichainProgress.tsx` - ✅ ALREADY EXISTS, needs wiring
- `app/src/screens/VerificationScreen.tsx` (or equivalent) - Display MultichainProgress component
- `app/src/screens/HistoryScreen.tsx` (or equivalent) - Show multichain status in history

---

## Implementation Steps

### Step 1: WebSocket Integration

The db-relayer WebSocket server broadcasts updates to the `StatusUpdatePayload` type which now includes multichain fields. The mobile app needs to listen for these updates and extract the multichain data.

#### A. Locate WebSocket Service

Find the WebSocket connection/listener code (likely in `app/src/services/websocket.ts` or similar).

#### B. Update Status Update Handler

When receiving status updates from the WebSocket, check for multichain fields and update the local database:

```typescript
// Example WebSocket handler update
interface StatusUpdate {
  // Existing fields...
  session_id: string;
  status: number;

  // NEW: Multichain fields from db-relayer
  is_multichain?: boolean;
  dest_chain_id?: number;
  dest_dapp_address?: string;
  config_id?: string;
  bridge_protocol?: 'layerzero' | 'wormhole';
  bridge_status?: string;
  bridge_tx_hash?: string;
  bridge_eta?: string;
  dest_tx_hash?: string;
  dest_status?: string;
  bridged_at?: string;
  delivered_at?: string;
}

function handleStatusUpdate(update: StatusUpdate) {
  // ... existing status update logic

  // NEW: Handle multichain updates
  if (update.is_multichain) {
    const multichainStatus: MultichainStatus = {
      isMultichain: true,
      destChainId: update.dest_chain_id,
      destChainName: getChainName(update.dest_chain_id || 0),
      origin: {
        status: update.bridge_tx_hash ? 'complete' : 'pending',
        txHash: update.bridge_tx_hash,
      },
      bridge: {
        status: parseBridgeStatus(update.bridge_status),
        protocol: update.bridge_protocol,
        detail: update.bridge_eta ? `ETA: ${update.bridge_eta}` : undefined,
        eta: update.bridge_eta,
      },
      destination: {
        status: parseDestStatus(update.dest_status),
        txHash: update.dest_tx_hash,
      },
    };

    // Update database with multichain status
    await updateProofMultichainStatus(update.session_id, multichainStatus);
  }
}

// Helper functions
function parseBridgeStatus(status?: string): 'pending' | 'in_progress' | 'complete' | 'failed' {
  switch (status) {
    case 'sent': return 'in_progress';
    case 'delivered': return 'complete';
    case 'failed': return 'failed';
    default: return 'pending';
  }
}

function parseDestStatus(status?: string): 'pending' | 'complete' | 'failed' {
  switch (status) {
    case 'delivered': return 'complete';
    case 'failed': return 'failed';
    default: return 'pending';
  }
}
```

### Step 2: Database Integration

#### A. Update Database Schema (SQLite)

The local SQLite database needs to store multichain status. Add a new column to the proofs table:

```sql
ALTER TABLE proofs ADD COLUMN multichain_status TEXT; -- Store JSON stringified MultichainStatus
```

#### B. Update Database Service

Modify the database service to:
1. Save multichain status when inserting new proofs
2. Update multichain status when receiving WebSocket updates
3. Parse multichain status when retrieving proofs

```typescript
// Example: Update insertProof
async function insertProof(proof: Omit<ProofHistory, 'id' | 'timestamp'>) {
  const multichainJson = proof.multichain ? JSON.stringify(proof.multichain) : null;

  await db.executeSql(
    `INSERT INTO proofs (
      session_id, app_name, user_id, user_id_type, endpoint, endpoint_type,
      status, error_code, error_reason, disclosures, logo_base64, document_id,
      multichain_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      proof.sessionId,
      proof.appName,
      proof.userId,
      proof.userIdType,
      proof.endpoint,
      proof.endpointType,
      proof.status,
      proof.errorCode,
      proof.errorReason,
      proof.disclosures,
      proof.logoBase64,
      proof.documentId,
      multichainJson,
    ]
  );
}

// Example: Update getHistory
async function getHistory(page = 0): Promise<ProofDBResult> {
  const results = await db.executeSql(
    `SELECT *, multichain_status FROM proofs ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
    [PAGE_SIZE, page * PAGE_SIZE]
  );

  const rows: ProofHistory[] = results[0].rows.raw().map((row: any) => ({
    ...row,
    multichain: row.multichain_status ? JSON.parse(row.multichain_status) : undefined,
  }));

  return { rows };
}

// NEW: Update multichain status
async function updateProofMultichainStatus(
  sessionId: string,
  multichainStatus: MultichainStatus
): Promise<void> {
  const multichainJson = JSON.stringify(multichainStatus);

  await db.executeSql(
    `UPDATE proofs SET multichain_status = ? WHERE session_id = ?`,
    [multichainJson, sessionId]
  );
}
```

### Step 3: UI Integration

#### A. Display MultichainProgress During Verification

In the verification flow screen (e.g., `VerificationScreen.tsx`), conditionally render the `MultichainProgress` component:

```tsx
import { MultichainProgress } from '@/components/MultichainProgress';
import type { MultichainStatus } from '@/stores/proofTypes';

function VerificationScreen() {
  const [multichainStatus, setMultichainStatus] = useState<MultichainStatus | null>(null);

  // ... existing verification logic

  // Listen for multichain updates
  useEffect(() => {
    if (!session_id) return;

    const unsubscribe = subscribeToWebSocket(session_id, (update) => {
      if (update.is_multichain && update.dest_chain_id) {
        setMultichainStatus({
          isMultichain: true,
          destChainId: update.dest_chain_id,
          destChainName: getChainName(update.dest_chain_id),
          origin: {
            status: update.bridge_tx_hash ? 'complete' : 'pending',
            txHash: update.bridge_tx_hash,
          },
          bridge: {
            status: parseBridgeStatus(update.bridge_status),
            protocol: update.bridge_protocol,
            detail: update.bridge_eta ? `ETA: ${update.bridge_eta}` : undefined,
            eta: update.bridge_eta,
          },
          destination: {
            status: parseDestStatus(update.dest_status),
            txHash: update.dest_tx_hash,
          },
        });
      }
    });

    return unsubscribe;
  }, [session_id]);

  return (
    <View>
      {/* Existing verification UI */}

      {/* NEW: Multichain progress */}
      {multichainStatus && (
        <MultichainProgress status={multichainStatus} />
      )}
    </View>
  );
}
```

#### B. Add Bridge Explorer Link

Add a button/link to open the bridge explorer:

```tsx
import { Linking } from 'react-native';
import { getBridgeExplorerUrl, getBridgeExplorerName } from '@/utils/bridgeExplorers';

function MultichainVerificationUI({ multichainStatus }: { multichainStatus: MultichainStatus }) {
  const openBridgeExplorer = () => {
    if (multichainStatus.bridge.protocol && multichainStatus.origin.txHash) {
      const url = getBridgeExplorerUrl(
        multichainStatus.bridge.protocol,
        multichainStatus.origin.txHash
      );
      Linking.openURL(url);
    }
  };

  return (
    <View>
      <MultichainProgress status={multichainStatus} />

      {multichainStatus.bridge.protocol && multichainStatus.origin.txHash && (
        <TouchableOpacity onPress={openBridgeExplorer}>
          <Text>
            Track on {getBridgeExplorerName(multichainStatus.bridge.protocol)}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

#### C. Show Multichain Status in History

In the history screen, display a badge or indicator for multichain verifications:

```tsx
import { getChainName } from '@/utils/bridgeExplorers';

function HistoryItem({ proof }: { proof: ProofHistory }) {
  return (
    <View>
      {/* Existing history item UI */}

      {/* NEW: Multichain indicator */}
      {proof.multichain?.isMultichain && (
        <View>
          <Text>🌐 Multichain</Text>
          <Text>→ {proof.multichain.destChainName || getChainName(proof.multichain.destChainId || 0)}</Text>
          <Text>Status: {proof.multichain.destination.status}</Text>
        </View>
      )}
    </View>
  );
}
```

---

## Testing

### Unit Tests

1. Test bridge explorer URL generation:
```typescript
// app/tests/utils/bridgeExplorers.test.ts
import { getBridgeExplorerUrl, getChainName } from '@/utils/bridgeExplorers';

describe('bridgeExplorers', () => {
  it('generates LayerZero explorer URL', () => {
    expect(getBridgeExplorerUrl('layerzero', '0x123')).toBe('https://layerzeroscan.com/tx/0x123');
  });

  it('generates Wormhole explorer URL', () => {
    expect(getBridgeExplorerUrl('wormhole', '0x456')).toBe('https://wormholescan.io/#/tx/0x456');
  });

  it('returns correct chain name', () => {
    expect(getChainName(8453)).toBe('Base');
    expect(getChainName(100)).toBe('Gnosis');
  });
});
```

2. Test WebSocket handler for multichain updates
3. Test database operations for multichain status

### Integration Tests

1. Test full multichain flow:
   - User initiates multichain verification
   - WebSocket updates received
   - UI updates in real-time
   - Database stores multichain status
   - History shows multichain indicator

2. Test bridge explorer link opens correctly

### E2E Tests (Maestro)

Add E2E test flow for multichain verification (optional, can be added later).

---

## Summary of Changes

| File | Type | Description |
|------|------|-------------|
| `app/src/utils/bridgeExplorers.ts` | NEW ✅ | Bridge explorer URL utilities |
| `app/src/services/websocket.ts` | MODIFY | Add multichain status update handlers |
| `app/src/services/database.ts` | MODIFY | Add multichain_status column and update queries |
| `app/src/screens/VerificationScreen.tsx` | MODIFY | Display MultichainProgress component |
| `app/src/screens/HistoryScreen.tsx` | MODIFY | Show multichain indicator in history |
| `app/tests/utils/bridgeExplorers.test.ts` | NEW | Unit tests for bridge explorer utils |

---

## Next Steps

1. ✅ Database schema extension (SQL migration created)
2. ✅ db-relayer types updated (Rust types.rs)
3. ✅ Bridge explorer utility created (bridgeExplorers.ts)
4. TODO: Implement WebSocket handler updates
5. TODO: Update database service (insertProof, getHistory, updateMultichainStatus)
6. TODO: Wire up MultichainProgress component in verification screen
7. TODO: Add multichain indicator to history screen
8. TODO: Add unit tests for new utilities
9. TODO: Integration testing

---

## Notes

- The `MultichainProgress` component already exists and handles the 3-step progress UI
- The `MultichainStatus` types are already defined in `app/src/stores/proofTypes.ts`
- Bridge explorer links allow users to track their cross-chain verification independently
- WebSocket provides real-time updates for better UX (no polling needed)
- All multichain fields are optional, so existing same-chain flows remain unchanged
