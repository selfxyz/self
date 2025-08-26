// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export function useNetInfo() {
  // when implementing this for real be ware that Network information API
  // is not available on webview on ios https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API
  return { isConnected: true, isInternetReachable: true };
}
