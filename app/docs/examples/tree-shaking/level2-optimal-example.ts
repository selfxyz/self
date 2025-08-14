// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

// Level 2 Granular Import Example - Optimal Tree Shaking
// This demonstrates the new file-based imports for maximum optimization

// Import only core constants (no country data, vkey, etc.)
import {
  API_URL,
  PASSPORT_ATTESTATION_ID,
} from '@selfxyz/common/constants/core';
// Import only passport types (no app types, certificate types, etc.)
import type { PassportData } from '@selfxyz/common/types/passport';
// Import only hash utilities (no bytes, trees, circuits, etc.)
import { hash } from '@selfxyz/common/utils/hash';

export function optimalLevel2Example(data: PassportData) {
  // This will result in the smallest possible bundle
  // Only the specific functions and constants we use are included
  console.log('Using API:', API_URL);

  console.log('Attestation ID:', PASSPORT_ATTESTATION_ID);

  const hashedData = hash(JSON.stringify(data));

  console.log('Hashed passport data:', hashedData);

  return {
    api: API_URL,
    attestationId: PASSPORT_ATTESTATION_ID,
    hash: hashedData,
  };
}
