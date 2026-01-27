// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Static feature flags for the SDK.
 * These are compile-time constants that control feature availability.
 * Set to true when ready to launch the feature.
 */
export const FeatureFlags = {
  /**
   * Enable Sumsub/KYC "Other IDs" option in the ID selection screen.
   * When false, the KYC button will be hidden from users.
   */
  KYC_ENABLED: false,
} as const;
