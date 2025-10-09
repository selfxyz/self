// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type {
  ACCESS_CONTROL,
  ACCESSIBLE,
  GetOptions,
  SECURITY_LEVEL,
  SetOptions,
} from 'react-native-keychain';
import Keychain from 'react-native-keychain';

/**
 * Security configuration for keychain operations
 */
export interface AdaptiveSecurityConfig {
  accessible: ACCESSIBLE;
  securityLevel?: SECURITY_LEVEL;
  accessControl?: ACCESS_CONTROL;
}

export interface GetSecureOptions {
  requireAuth?: boolean;
  promptMessage?: string;
}

/**
 * Device security capabilities
 */
export interface SecurityCapabilities {
  hasPasscode: boolean;
  hasSecureHardware: boolean;
  supportsBiometrics: boolean;
  maxSecurityLevel: SECURITY_LEVEL;
}

/**
 * Check if device supports biometric authentication
 */
export async function checkBiometricsAvailable(): Promise<boolean> {
  try {
    // Import dynamically to avoid circular dependency
    const ReactNativeBiometrics = (await import('react-native-biometrics'))
      .default;
    const rnBiometrics = new ReactNativeBiometrics();
    const { available } = await rnBiometrics.isSensorAvailable();
    return available;
  } catch {
    console.log('Biometrics not available');
    return false;
  }
}

/**
 * Check if device has a passcode set by attempting to store a test item
 */
export async function checkPasscodeAvailable(): Promise<boolean> {
  try {
    const testService = `passcode-test-${Date.now()}`;
    await Keychain.setGenericPassword('test', 'test', {
      service: testService,
      accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
    });
    // Clean up test entry
    await Keychain.resetGenericPassword({ service: testService });
    return true;
  } catch {
    console.log('Device passcode not available');
    return false;
  }
}

/**
 * Create keychain options with adaptive security
 */
export async function createKeychainOptions(
  options: GetSecureOptions,
  capabilities?: SecurityCapabilities,
): Promise<{
  setOptions: SetOptions;
  getOptions: GetOptions;
}> {
  const config = await getAdaptiveSecurityConfig(
    options.requireAuth,
    capabilities,
  );

  const setOptions: SetOptions = {
    accessible: config.accessible,
    ...(config.securityLevel && { securityLevel: config.securityLevel }),
    ...(config.accessControl && { accessControl: config.accessControl }),
  };

  const getOptions: GetOptions = {
    ...(config.accessControl && {
      accessControl: config.accessControl,
      authenticationPrompt: {
        title: 'Authenticate to access secure data',
        subtitle: 'Use biometrics or device passcode',
        cancel: 'Cancel',
      },
    }),
  };

  return { setOptions, getOptions };
}

/**
 * Detect device security capabilities
 */
export async function detectSecurityCapabilities(): Promise<SecurityCapabilities> {
  const [hasPasscode, maxSecurityLevel, supportsBiometrics] = await Promise.all(
    [
      checkPasscodeAvailable(),
      getMaxSecurityLevel(),
      checkBiometricsAvailable(),
    ],
  );

  const hasSecureHardware =
    maxSecurityLevel === Keychain.SECURITY_LEVEL.SECURE_HARDWARE;

  return {
    hasPasscode,
    hasSecureHardware,
    supportsBiometrics,
    maxSecurityLevel,
  };
}

/**
 * Get adaptive security configuration based on device capabilities
 */
export async function getAdaptiveSecurityConfig(
  requireAuth: boolean = false,
  capabilities?: SecurityCapabilities,
): Promise<AdaptiveSecurityConfig> {
  const caps = capabilities || (await detectSecurityCapabilities());
  // Determine the best accessible setting
  let accessible: ACCESSIBLE;
  if (caps.hasPasscode) {
    accessible = Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY;
  } else {
    // Fallback to device-only but less restrictive
    accessible = Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY;
  }

  // Determine the best security level (Android)
  let securityLevel: SECURITY_LEVEL;
  if (caps.hasSecureHardware) {
    securityLevel = Keychain.SECURITY_LEVEL.SECURE_HARDWARE;
  } else if (
    caps.maxSecurityLevel === Keychain.SECURITY_LEVEL.SECURE_SOFTWARE
  ) {
    securityLevel = Keychain.SECURITY_LEVEL.SECURE_SOFTWARE;
  } else {
    securityLevel = Keychain.SECURITY_LEVEL.ANY;
  }

  // Determine the best access control
  let accessControl: ACCESS_CONTROL | undefined;
  if (requireAuth) {
    if (caps.supportsBiometrics && caps.hasPasscode) {
      accessControl = Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE;
    } else if (caps.hasPasscode) {
      accessControl = Keychain.ACCESS_CONTROL.DEVICE_PASSCODE;
    } else {
      // Don't require additional authentication if no passcode is set
      accessControl = undefined;
    }
  } else {
    accessControl = undefined;
  }

  return {
    accessible,
    securityLevel,
    accessControl,
  };
}

/**
 * Get the maximum security level supported by the device
 */
export async function getMaxSecurityLevel(): Promise<SECURITY_LEVEL> {
  try {
    // Try to get the device's security level
    const securityLevel = await Keychain.getSecurityLevel();
    return securityLevel || Keychain.SECURITY_LEVEL.ANY;
  } catch {
    console.log('Could not determine security level, defaulting to ANY');
    return Keychain.SECURITY_LEVEL.ANY;
  }
}

/**
 * Log security configuration for debugging
 */
export function logSecurityConfig(
  capabilities: SecurityCapabilities,
  config: AdaptiveSecurityConfig,
): void {
  console.log('🔒 Device Security Capabilities:', {
    hasPasscode: capabilities.hasPasscode,
    hasSecureHardware: capabilities.hasSecureHardware,
    supportsBiometrics: capabilities.supportsBiometrics,
    maxSecurityLevel: capabilities.maxSecurityLevel,
  });

  console.log('🔧 Adaptive Security Configuration:', {
    accessible: config.accessible,
    securityLevel: config.securityLevel,
    accessControl: config.accessControl,
  });
}
