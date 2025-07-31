// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

// Import constants from the constants module
import {
  API_URL,
  countryCodes,
  PASSPORT_ATTESTATION_ID,
} from '@selfxyz/common/constants';
// Import types (these are eliminated during compilation anyway)
import type { PassportData } from '@selfxyz/common/types';
// Import utilities from the utils module
import { generateCommitment, hash } from '@selfxyz/common/utils';

// Example: A real-world function that uses multiple imports efficiently
export function processPassportData(passportData: PassportData): {
  commitment: string;
  hash: string;
  apiEndpoint: string;
  isValidCountry: boolean;
} {
  return {
    // Note: These are simplified examples - real usage requires proper parameters
    commitment: 'mock-commitment', // generateCommitment needs secret, attestation_id, passportData
    hash: 'mock-hash', // hash needs hashFunction, bytesArray, format parameters
    apiEndpoint: API_URL,
    // Extract country code from MRZ (positions 2-4 in passport MRZ)
    isValidCountry: Object.keys(countryCodes).includes(
      passportData.mrz?.slice(2, 5) || '',
    ),
  };
}

// This pattern provides:
// ✅ Minimal bundle size
// ✅ Clear dependency tracking
// ✅ Excellent tree shaking
// ✅ Type safety
// ✅ IDE autocomplete and refactoring support
