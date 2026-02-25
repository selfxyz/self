# Database & Persistence

## Overview

No traditional backend database. On-chain smart contracts are the source of truth. Local persistence uses three tiers based on data sensitivity.

## Storage Tiers

```
┌──────────────────────────────────────────────┐
│ Tier 1: Keychain (Secrets)                   │
│ ├── Mnemonic phrase                          │
│ ├── Private keys                             │
│ └── Biometric-gated access only              │
│ Package: react-native-keychain               │
│ NO web fallback (security boundary)          │
├──────────────────────────────────────────────┤
│ Tier 2: SQLite (Structured Data)             │
│ ├── proof_history table                      │
│ ├── Pagination (PAGE_SIZE=20)                │
│ └── Stale proof cleanup (10-min timeout)     │
│ Package: react-native-sqlite-storage         │
│ DB file: proof_history.db                    │
│ Web: stub implementation (database.web.ts)   │
├──────────────────────────────────────────────┤
│ Tier 3: AsyncStorage (App State)             │
│ ├── User preferences                         │
│ ├── Zustand persisted stores                 │
│ └── Feature flags, non-sensitive cache       │
│ Package: @react-native-async-storage         │
└──────────────────────────────────────────────┘
```

## SDK Document Persistence

The SDK uses a `DocumentsAdapter` interface for document catalog storage:

| Platform | Implementation |
|----------|---------------|
| React Native | AsyncStorage (key prefix: `@self:document:`) |
| WebView/Web | IndexedDB (`documents-web.ts` adapter) |

Operations: `loadDocumentCatalog`, `saveDocumentCatalog`, `loadDocumentById`, `saveDocument`, `deleteDocument` — all must be idempotent.

## On-Chain State

Smart contracts maintain:
- Merkle trees (commitment tree, DSC tree, CSCA tree)
- Nullifiers (prevent double-registration)
- Verification configurations
- Attestation registries

## DOs

- DO use Keychain for ALL secrets (mnemonics, private keys, auth tokens)
- DO use SQLite for structured, queryable local data (proof history)
- DO use AsyncStorage for non-sensitive app state and Zustand persistence
- DO implement the `DocumentsAdapter` interface for SDK document storage
- DO clean up stale proofs (10-minute timeout for pending proofs)
- DO use pagination for SQLite queries (PAGE_SIZE=20)

## DON'Ts

- DON'T store secrets in AsyncStorage or SQLite
- DON'T create web implementations for Keychain — it's a security boundary
- DON'T treat local storage as source of truth — on-chain state is canonical
- DON'T add new SQLite tables without considering the web stub fallback
- DON'T bypass the DocumentsAdapter interface for SDK document operations
