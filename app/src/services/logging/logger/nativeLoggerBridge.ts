// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

import type { LoggerExtension, RootLogger } from '@/services/logging';

// Remove direct imports to avoid module cycle
// Dependencies will be injected via setupNativeLoggerBridge

interface NativeLogEvent {
  level: 'debug' | 'info' | 'warn' | 'error';
  category: string;
  message: string;
  data?: unknown;
}

let eventEmitter: NativeEventEmitter | null = null;
let isInitialized = false;
let injectedLoggers: {
  AppLogger: LoggerExtension;
  NfcLogger: LoggerExtension;
  Logger: RootLogger;
} | null = null;

const setupNativeLoggerBridge = (loggers: {
  AppLogger: LoggerExtension;
  NfcLogger: LoggerExtension;
  Logger: RootLogger;
}) => {
  if (isInitialized) return;

  // Store injected loggers
  injectedLoggers = loggers;

  const moduleName =
    Platform.OS === 'android' ? 'RNPassportReader' : 'NativeLoggerBridge';

  if (NativeModules[moduleName]) {
    eventEmitter = new NativeEventEmitter(NativeModules[moduleName]);
    setupEventListeners();
    isInitialized = true;
    console.log(
      `NativeLoggerBridge initialized successfully with ${moduleName}`,
    );
  }
};

const setupEventListeners = () => {
  if (!eventEmitter) return;

  eventEmitter.addListener('logEvent', (event: NativeLogEvent | string) => {
    if (typeof event === 'string') {
      try {
        const parsedEvent = JSON.parse(event);
        handleNativeLogEvent(parsedEvent);
      } catch {
        console.warn('Failed to parse logEvent string:', event);
      }
    } else {
      handleNativeLogEvent(event);
    }
  });
};

const handleNativeLogEvent = (event: NativeLogEvent) => {
  if (!injectedLoggers) {
    console.warn('NativeLoggerBridge not initialized with loggers');
    return;
  }

  const { level, category, message, data } = event;

  // Route to appropriate logger based on category
  let logger: LoggerExtension;
  switch (category.toLowerCase()) {
    case 'nfc':
      logger = injectedLoggers.NfcLogger;
      break;
    case 'app':
      logger = injectedLoggers.AppLogger;
      break;
    default:
      // For unknown categories, use Logger with category prefix
      logger = injectedLoggers.Logger.extend(category.toUpperCase());
  }

  // Log with appropriate level
  switch (level) {
    case 'debug':
      logger.debug(message, data);
      break;
    case 'info':
      logger.info(message, data);
      break;
    case 'warn':
      logger.warn(message, data);
      break;
    case 'error':
      logger.error(message, data);
      break;
    default:
      logger.info(message, data);
  }
};

const cleanup = () => {
  if (eventEmitter) {
    eventEmitter.removeAllListeners('logEvent');
    eventEmitter = null;
  }
  isInitialized = false;
  injectedLoggers = null;
};

// Export the setup function for explicit initialization
export { cleanup, setupNativeLoggerBridge };
