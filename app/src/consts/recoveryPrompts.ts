// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export type RecoveryPromptAllowedRoute =
  (typeof RECOVERY_PROMPT_ALLOWED_ROUTES)[number];

export const RECOVERY_PROMPT_ALLOWED_ROUTES = ['Home'] as const;
