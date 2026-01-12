// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Constant indicating if the app is running in development mode.
 * Safely handles cases where __DEV__ might not be defined.
 * Use this constant instead of checking __DEV__ directly throughout the codebase.
 */
export const IS_DEV_MODE = typeof __DEV__ !== 'undefined' && __DEV__;
export const IS_EUCLID_ENABLED = false; // Enabled for proof request UI redesign
