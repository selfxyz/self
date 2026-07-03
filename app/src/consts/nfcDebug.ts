// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// NFC-debug server (auto-start agent). One host serves the HTTP endpoints
// (/session, /debug/result) and the /device WebSocket. Kept out of
// consts/links.ts, which is https-only user-facing links.
const nfcDebugHost = 'nfc-mcp.self.xyz';

export const nfcDebugApiBaseUrl = `https://${nfcDebugHost}`;
export const nfcDebugRelayUrl = `wss://${nfcDebugHost}/device`;
