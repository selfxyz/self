// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// When the WebView loads index.html from `file:///android_asset/self-wallet/index.html`
// (rn-sdk) or `file:///.../self-wallet/index.html` (iOS), absolute asset URLs that
// euclid hardcodes (e.g. `/animations/proof-progress.json`) resolve against the
// filesystem root and 404. This shim rewrites those requests to be relative to the
// bundle root so they resolve to the actual asset on disk.

const PUBLIC_ASSET_PREFIXES = ['/animations/', '/backgrounds/', '/fonts/', '/logos/', '/icons/'];

let bundleRoot = '';

function computeBundleRoot(): string {
  for (const script of Array.from(document.scripts)) {
    const resolved = script.src;
    if (!resolved) continue;
    const match = resolved.match(/^(.*\/)assets\/[^/]+\.js(?:\?.*)?$/);
    if (match) return match[1];
  }
  return new URL('./', document.baseURI).href;
}

function shouldRewrite(url: string): boolean {
  if (!url.startsWith('/')) return false;
  return PUBLIC_ASSET_PREFIXES.some(prefix => url.startsWith(prefix));
}

function rewrite(url: string): string {
  return `${bundleRoot}${url.slice(1)}`;
}

export function installAssetPathShim(): void {
  if (typeof window === 'undefined') return;
  if (window.location.protocol !== 'file:') return;

  bundleRoot = computeBundleRoot();

  const OriginalXHR = window.XMLHttpRequest;
  const originalOpen = OriginalXHR.prototype.open;
  OriginalXHR.prototype.open = function patchedOpen(method: string, url: string | URL, ...rest: unknown[]): void {
    const urlStr = typeof url === 'string' ? url : url.toString();
    const finalUrl = shouldRewrite(urlStr) ? rewrite(urlStr) : urlStr;
    return originalOpen.call(this, method, finalUrl, ...(rest as []));
  };

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && shouldRewrite(input)) {
      return originalFetch(rewrite(input), init);
    }
    if (input instanceof URL && shouldRewrite(input.pathname)) {
      return originalFetch(rewrite(input.pathname) + input.search + input.hash, init);
    }
    if (input instanceof Request && shouldRewrite(new URL(input.url).pathname)) {
      const u = new URL(input.url);
      return originalFetch(new Request(rewrite(u.pathname) + u.search + u.hash, input), init);
    }
    return originalFetch(input, init);
  };
}
