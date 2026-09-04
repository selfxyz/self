// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export const KYC_PROVIDER = 'didit';

// TODO: temporary kill switch. Flip back to true to restore the third-party
// (Didit) verification path: ID picker entry, trouble-screen fallbacks, the
// chip-symbol "No" path and the cancel-flow fallback modal. In-flight sessions
// (pending store, result notifications) keep resolving regardless.
export const KYC_FLOW_ENABLED = false;

export const isKycFlowEnabled = (): boolean => KYC_FLOW_ENABLED;
