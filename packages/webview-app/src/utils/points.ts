// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { secp256k1 } from '@noble/curves/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3';
import { HDKey } from '@scure/bip32';
import { mnemonicToSeedSync } from '@scure/bip39';

// Mirrors the phone app's points identity: account index 1 of the account
// mnemonic (authProvider._generateAddressFromMnemonic(mnemonic, 1)), so a
// linked browser resolves the same balance as the phone.
const POINTS_DERIVATION_PATH = "m/44'/60'/0'/0/1";
const POINTS_API_BASE_URL = 'https://points.self.xyz';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function derivePointsAddress(mnemonic: string): string {
  const seed = mnemonicToSeedSync(mnemonic);
  const derived = HDKey.fromMasterSeed(seed).derive(POINTS_DERIVATION_PATH);
  if (!derived.privateKey) throw new Error('Failed to derive points key');
  const uncompressed = secp256k1.getPublicKey(derived.privateKey, false).slice(1);
  return '0x' + bytesToHex(keccak_256(uncompressed).slice(-20));
}

export async function fetchTotalPoints(address: string): Promise<number> {
  try {
    const response = await fetch(`${POINTS_API_BASE_URL}/points/${address.toLowerCase()}`);
    if (!response.ok) return 0;
    const data = await response.json();
    return data.total_points || 0;
  } catch {
    return 0;
  }
}

export async function fetchIncomingPoints(address: string): Promise<number> {
  try {
    const response = await fetch(`${POINTS_API_BASE_URL}/points/${address.toLowerCase()}`);
    if (!response.ok) return 0;
    const data = await response.json();
    return data.points || 0;
  } catch {
    return 0;
  }
}
