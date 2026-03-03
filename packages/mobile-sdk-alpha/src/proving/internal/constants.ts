// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export const JSONRPC_VERSION = '2.0' as const;
export const MAX_RECONNECT_ATTEMPTS = 3;
export const RECONNECT_BASE_BACKOFF_MS = 1000;

export const RECONNECT_MAX_BACKOFF_MS = 10000;
export const RECONNECT_TIMEOUT_MS = 15000;
export const SUBMIT_ID = 2 as const;
export const SUBMIT_METHOD = 'openpassport_submit_request' as const;
