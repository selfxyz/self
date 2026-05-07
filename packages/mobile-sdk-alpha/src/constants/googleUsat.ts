// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export const CELO_MAINNET_CHAIN_ID = 42220;
export const CELO_SEPOLIA_CHAIN_ID = 11142220;

// Verifier contract addresses are public, lowercased, and chain-scoped.
// Update entries when verifier contracts are redeployed.
export const GOOGLE_USAT_FAUCET_VERIFIERS: Readonly<Record<number, ReadonlySet<string>>> = {
  [CELO_MAINNET_CHAIN_ID]: new Set<string>([GOOGLE_USAT_MAINNET_VERIFIER]),
  [CELO_SEPOLIA_CHAIN_ID]: new Set<string>([GOOGLE_USAT_SEPOLIA_VERIFIER]),
};

export const GOOGLE_USAT_MAINNET_VERIFIER = '0xc04157590b07914bcdd665f6a62cc220ab0ddec5';

export const GOOGLE_USAT_SEPOLIA_VERIFIER = '0x5df9232ad9fdbf425cc1087e5396456ca6976299';
