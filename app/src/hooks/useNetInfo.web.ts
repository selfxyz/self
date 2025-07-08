// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

export function useNetInfo() {
  // when implementing this for real be ware that Network information API
  // is not available on webview on ios https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API
  return { isConnected: true, isInternetReachable: true };
}
