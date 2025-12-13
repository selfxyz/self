// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Platform } from 'react-native';

/**
 * WebView request object with iOS-specific properties for navigation control.
 * Used to determine if a navigation is user-initiated and from the top frame.
 */
export interface WebViewRequestWithIosProps {
  isTopFrame?: boolean;
  navigationType?:
    | 'click'
    | 'formsubmit'
    | 'formresubmit'
    | 'backforward'
    | 'reload'
    | 'other';
}

/**
 * Domains that should always open externally (e.g., wallet popups that require
 * a full browser context to maintain window.opener relationship).
 */
export const ALWAYS_OPEN_EXTERNALLY = Object.freeze([
  'keys.coinbase.com',
]) as readonly string[];

/**
 * Schemes that are disallowed from being opened externally.
 * Using a blacklist approach - block specific dangerous schemes, allow everything else.
 */
export const DISALLOWED_SCHEMES = Object.freeze([
  'ftp://',
  'file://',
  // eslint-disable-next-line no-script-url
  'javascript:',
]) as readonly string[];

/**
 * Trusted entrypoints: these domains are allowed to start a session.
 * Once a session starts from a trusted domain, HTTPS child navigations are
 * allowed without expanding this list (parent-trusted session model).
 * This keeps partners from breaking the WebView when they add dependencies,
 * while still requiring the initial navigation to be curated.
 */
export const TRUSTED_DOMAINS = Object.freeze([
  'aave.com', // Aave protocol - DeFi lending network
  'amity-lock-11401309.figma.site', // Degen Tarot game
  'celo.org', // CELO Names - includes names.celo.org
  'cloud.google.com', // Google Cloud - AI agents in the cloud (includes cloud.google.com)
  'coinbase.com', // Coinbase - Main domain
  'karmahq.xyz', // Karma - Launch & fund projects
  'keys.coinbase.com', // Coinbase Keys - Wallet for your crypto
  'lemonade.social', // Lemonade - Events and communities
  'self.xyz', // Base domain and all subdomains (*.self.xyz) - includes espresso.self.xyz
  'talent.app', // Talent Protocol - Main app
  'talentprotocol.com', // Talent Protocol - Marketing/info site
  'velodrome.finance', // Velodrome - Swap, deposit, take the lead
]) as readonly string[];

/**
 * Check if a URL is an allowed about: URL (about:blank or about:srcdoc).
 * These URLs are allowed during trusted sessions for wallet bootstrap flows.
 */
export const isAllowedAboutUrl = (url: string): boolean => {
  const lower = url.toLowerCase();
  return lower === 'about:blank' || lower === 'about:srcdoc';
};

/**
 * Check if two URLs have the same origin (protocol + host + port).
 * Returns false for malformed URLs.
 */
export const isSameOrigin = (url1: string, url2: string): boolean => {
  try {
    return new URL(url1).origin === new URL(url2).origin;
  } catch {
    return false;
  }
};

/**
 * Check if a URL is from a trusted domain.
 * Matches exact domain or any subdomain of trusted domains.
 * Returns false for malformed URLs.
 */
export const isTrustedDomain = (url: string): boolean => {
  try {
    const hostname = new URL(url).hostname;
    return TRUSTED_DOMAINS.some(
      domain => hostname === domain || hostname.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
};

/**
 * iOS-only mitigation for drive-by deep-linking via iframes.
 * Gates external URL opens to top-frame, user-initiated navigations.
 *
 * On iOS, isTopFrame and navigationType are available on the request object.
 * On Android, these properties are unavailable, so we allow all navigations.
 *
 * This prevents malicious iframes on trusted partner sites from invoking
 * external app opens (sms:, mailto:, etc.) without explicit user interaction.
 */
export const isUserInitiatedTopFrameNavigation = (
  req: WebViewRequestWithIosProps,
): boolean => {
  // Android: these properties are unavailable, allow all navigations
  if (Platform.OS !== 'ios') {
    return true;
  }

  // iOS: block if explicitly from an iframe
  if (req.isTopFrame === false) {
    return false;
  }

  // iOS: only allow 'click' or undefined (backward compatibility) navigations
  // Block 'other', 'reload', 'formsubmit', 'backforward' as non-user-initiated
  const navType = req.navigationType;
  if (navType !== undefined && navType !== 'click') {
    return false;
  }

  return true;
};

/**
 * Determine if a URL should always be opened externally.
 * Used for special cases like Coinbase wallet that require window.opener.
 * Returns false for malformed URLs.
 */
export const shouldAlwaysOpenExternally = (url: string): boolean => {
  try {
    const hostname = new URL(url).hostname;
    return ALWAYS_OPEN_EXTERNALLY.some(
      domain => hostname === domain || hostname.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
};
