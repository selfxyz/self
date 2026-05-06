// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Addresses are public, lowercased, and chain-scoped. Populated in a follow-up PR.
export const GOOGLE_USAT_FAUCET_VERIFIERS: Readonly<Record<number, ReadonlySet<string>>> = {
  42220: new Set<string>([]), // Celo mainnet — TODO populate
  11142220: new Set<string>([]), // Celo Sepolia — TODO populate
};
