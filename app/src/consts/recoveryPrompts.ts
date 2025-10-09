// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Screens where interrupting the user with a recovery prompt could break
 * high-sensitivity capture flows. Keep this list tight to avoid regression.
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

export type CriticalRecoveryPromptRoute =
  (typeof CRITICAL_RECOVERY_PROMPT_ROUTES)[number];
