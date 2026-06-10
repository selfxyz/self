// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Resolve the iOS main-bundle path from whichever provider the host supplies.
 *
 * Precedence: react-native-fs's MainBundlePath, then a host-injected bundle URI
 * (the `bundleRootUri` prop). MainBundlePath is a native constant, so the JS
 * module can resolve while the native module is unlinked, yielding undefined —
 * callers must pass the raw value and let this decide, not assume a successful
 * require means a usable path.
 *
 * Returns a scheme-less, trailing-slash-free path so callers can build a single
 * well-formed file:// URL. Returns undefined when no provider supplies one.
 */
export const resolveBundlePath = (
  rnfsMainBundlePath?: unknown,
  bundleRootUri?: unknown,
): string | undefined => {
  if (typeof rnfsMainBundlePath === 'string' && rnfsMainBundlePath.length > 0) {
    return rnfsMainBundlePath;
  }
  if (typeof bundleRootUri === 'string' && bundleRootUri.length > 0) {
    // Keep percent-encoding intact: callers prepend `file://` to build the
    // WebView source URL, so decoding here would turn `My%20App.app` into a
    // literal space and yield a malformed file:// URL that WKWebView rejects.
    return bundleRootUri.replace(/^file:\/\//, '').replace(/\/+$/, '');
  }
  return undefined;
};
