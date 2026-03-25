// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export type {
  ApplicantInfoSerialized,
  DiditVerificationResult,
  SessionResponse,
} from '@/integrations/didit/types';
export {
  type DiditConfig,
  createSession,
  launchDidit,
} from '@/integrations/didit/diditService';
