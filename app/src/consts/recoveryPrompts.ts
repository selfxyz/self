// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Screens where we intentionally show the recovery reminder. This allow list is
 * intentionally short so that new product surfaces do not accidentally inherit
 * the prompt without design review.
 */
export const RECOVERY_PROMPT_ALLOWED_ROUTES = [
  'Home',
  'ProofHistory',
  'ProofHistoryDetail',
  'ManageDocuments',
  'Settings',
] as const;

/**
 * Capture and scanning flows that should never be interrupted by a modal. We
 * keep this block list both for documentation and to use in tests.
 */
export const CRITICAL_RECOVERY_PROMPT_ROUTES = [
  'DocumentCamera',
  'DocumentCameraTrouble',
  'DocumentNFCMethodSelection',
  'DocumentNFCScan',
  'DocumentNFCTrouble',
  'QRCodeViewFinder',
  'QRCodeTrouble',
] as const;

export type RecoveryPromptAllowedRoute =
  (typeof RECOVERY_PROMPT_ALLOWED_ROUTES)[number];
