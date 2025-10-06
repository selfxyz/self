// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Options for MRZ scanning.
 * Reserved for future use; currently no options are accepted.
 */
export type MRZScanOptions = Record<string, never>;

// Re-export processing functions
export { extractMRZInfo, extractNameFromMRZ, formatDateToYYMMDD } from '../processing/mrz';
