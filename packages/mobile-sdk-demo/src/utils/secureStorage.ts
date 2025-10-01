// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Platform } from 'react-native';
import 'react-native-get-random-values';
import * as Keychain from 'react-native-keychain';

/**
 * ⚠️ SECURITY WARNING & IMPLEMENTATION DETAILS ⚠️
 *
 * This module provides a secure storage mechanism for secrets using a
 * platform-specific approach:
 *
 * - NATIVE (iOS/Android): Uses `react-native-keychain` to store secrets in the
 *   platform's secure hardware-backed Keystore (Android) or Keychain (iOS).
 *   This is a production-ready, secure approach for mobile.
 *
 * - WEB/OTHER: Falls back to an INSECURE `localStorage` implementation.
 *   This is for development and demo purposes ONLY.
 *
 *   Security Limitations of the Web Implementation:
 *   1. localStorage is NOT secure - accessible to any JavaScript on the same origin
 *   2. Vulnerable to XSS attacks
 *   3. No encryption at rest
 *   4. Visible in browser DevTools
 *
 * DO NOT use the web fallback in a production web environment with real user data.
 */

const SECRET_STORAGE_KEY = 'self-demo-secret';
const SECRET_VERSION_KEY = 'self-demo-secret-version';
const CURRENT_VERSION = '1.0';

// For Keychain, we use a service name
const KEYCHAIN_SERVICE = 'com.self.demo.secret';

export interface SecretMetadata {
  version: string;
  createdAt: string;
  lastAccessed: string;
}

/**
 * Generate a cryptographically secure random secret
 * Uses Web Crypto API for CSPRNG (Cryptographically Secure Pseudo-Random Number Generator)
 */
export const generateSecret = (): string => {
  const randomBytes = new Uint8Array(32); // 256 bits
  crypto.getRandomValues(randomBytes);

  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// --- Web (Insecure) Implementation ---

const getOrCreateSecretWeb = async (): Promise<string> => {
  try {
    // Try to load existing secret
    const existingSecret = localStorage.getItem(SECRET_STORAGE_KEY);
    const metadataStr = localStorage.getItem(SECRET_VERSION_KEY);

    if (existingSecret && metadataStr) {
      // Update last accessed time
      const metadata: SecretMetadata = JSON.parse(metadataStr);
      metadata.lastAccessed = new Date().toISOString();
      localStorage.setItem(SECRET_VERSION_KEY, JSON.stringify(metadata));

      console.log('[SecureStorage] Loaded existing secret from localStorage');
      return existingSecret;
    }

    // Generate new secret
    const newSecret = generateSecret();
    const metadata: SecretMetadata = {
      version: CURRENT_VERSION,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
    };

    // Store secret and metadata
    localStorage.setItem(SECRET_STORAGE_KEY, newSecret);
    localStorage.setItem(SECRET_VERSION_KEY, JSON.stringify(metadata));

    console.log('[SecureStorage] Generated new secret for demo app');
    console.warn('[SecureStorage] ⚠️  SECRET STORED IN INSECURE localStorage - DEMO ONLY ⚠️');

    return newSecret;
  } catch (error) {
    console.error('[SecureStorage] Failed to get/create secret:', error);
    throw error;
  }
};

const hasSecretWeb = (): boolean => {
  return !!localStorage.getItem(SECRET_STORAGE_KEY);
};

const getSecretMetadataWeb = (): SecretMetadata | null => {
  const metadataStr = localStorage.getItem(SECRET_VERSION_KEY);
  if (!metadataStr) return null;

  try {
    return JSON.parse(metadataStr) as SecretMetadata;
  } catch {
    return null;
  }
};

const clearSecretWeb = (): void => {
  localStorage.removeItem(SECRET_STORAGE_KEY);
  localStorage.removeItem(SECRET_VERSION_KEY);
  console.log('[SecureStorage] Secret cleared from localStorage');
};

// --- Native (Secure) Implementation ---

const getOrCreateSecretNative = async (): Promise<string> => {
  try {
    // Try to load existing secret
    const credentials = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });

    if (credentials) {
      // In a real app, you might want to update metadata here too.
      // For simplicity, we are not storing metadata in the keychain in this example.
      console.log('[SecureStorage] Loaded existing secret from Keychain');
      return credentials.password;
    }

    // Generate new secret
    const newSecret = generateSecret();

    // Store secret in Keychain
    await Keychain.setGenericPassword('secret', newSecret, { service: KEYCHAIN_SERVICE });

    console.log('[SecureStorage] Generated and stored new secret in Keychain');
    return newSecret;
  } catch (error) {
    console.error('[SecureStorage] Failed to get/create secret from Keychain:', error);
    throw error;
  }
};

const hasSecretNative = async (): Promise<boolean> => {
  try {
    const credentials = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
    return !!credentials;
  } catch (error) {
    console.error('[SecureStorage] Failed to check for secret in Keychain:', error);
    return false;
  }
};

const getSecretMetadataNative = async (): Promise<SecretMetadata | null> => {
  // Metadata is not stored in the native implementation for this example
  // A more advanced implementation might store it as a separate keychain entry
  console.log('[SecureStorage] Metadata is not available in the native (Keychain) implementation.');
  return null;
};

const clearSecretNative = async (): Promise<void> => {
  try {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
    console.log('[SecureStorage] Secret cleared from Keychain');
  } catch (error) {
    console.error('[SecureStorage] Failed to clear secret from Keychain:', error);
  }
};

// --- Platform-Specific Exports ---

/**
 * Get or create a secret for the demo app.
 * Uses Keychain on native and localStorage on web.
 *
 * @returns A Promise resolving to the secret as a hex string (64 characters).
 */
export const getOrCreateSecret = async (): Promise<string> => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return getOrCreateSecretNative();
  }
  return getOrCreateSecretWeb();
};

/**
 * Check if a secret exists in storage.
 * Uses Keychain on native and localStorage on web.
 *
 * @returns A Promise resolving to true if a secret exists, false otherwise.
 */
export const hasSecret = async (): Promise<boolean> => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return hasSecretNative();
  }
  // hasSecretWeb is synchronous, so we wrap it in a promise to match the async signature
  return Promise.resolve(hasSecretWeb());
};

/**
 * Get secret metadata (for debugging/testing).
 * NOTE: Metadata is a web-only feature for this demo implementation and
 * will return `null` on native platforms.
 *
 * @returns A Promise resolving to the secret metadata or null.
 */
export const getSecretMetadata = async (): Promise<SecretMetadata | null> => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return getSecretMetadataNative();
  }
  // getSecretMetadataWeb is synchronous, so we wrap it in a promise to match the async signature
  return Promise.resolve(getSecretMetadataWeb());
};

/**
 * Clear the stored secret (for testing/reset).
 * ⚠️ This will permanently delete the user's identity commitment!
 * Uses Keychain on native and localStorage on web.
 *
 * @returns A Promise that resolves when the secret has been cleared.
 */
export const clearSecret = async (): Promise<void> => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return clearSecretNative();
  }
  // clearSecretWeb is synchronous, so we wrap it in a promise to match the async signature
  return Promise.resolve(clearSecretWeb());
};

/**
 * Validate that a secret is well-formed
 * @param secret - The secret to validate
 * @returns true if the secret is valid
 */
export const isValidSecret = (secret: string): boolean => {
  // Must be 64 hex characters (32 bytes)
  return /^[0-9a-f]{64}$/i.test(secret);
};
