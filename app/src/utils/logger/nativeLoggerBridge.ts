// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { NativeEventEmitter, NativeModules } from 'react-native';

import { AppLogger, Logger, NfcLogger } from '../logger';

interface NativeLogEvent {
  level: 'debug' | 'info' | 'warn' | 'error';
  category: string;
  message: string;
  data?: any;
}

let eventEmitter: NativeEventEmitter | null = null;
let isInitialized = false;

const setupNativeLoggerBridge = () => {
  if (isInitialized) return;

  // Check if native module exists
  if (NativeModules.NativeLoggerBridge) {
    eventEmitter = new NativeEventEmitter(NativeModules.NativeLoggerBridge);
    setupEventListeners();
    isInitialized = true;
    console.log('NativeLoggerBridge initialized successfully');
  } else {
    console.warn('NativeLoggerBridge native module not found');
  }
};

const setupEventListeners = () => {
  if (!eventEmitter) return;

  eventEmitter.addListener('logEvent', (event: NativeLogEvent) => {
    handleNativeLogEvent(event);
  });
};

const handleNativeLogEvent = (event: NativeLogEvent) => {
  const { level, category, message, data } = event;
  console.log('handleNativeLogEvent', event);

  // Route to appropriate logger based on category
  let logger;
  switch (category.toLowerCase()) {
    case 'nfc':
      logger = NfcLogger;
      break;
    case 'app':
      logger = AppLogger;
      break;
    default:
      // For unknown categories, use AppLogger with category prefix
      logger = Logger.extend(category.toUpperCase());
  }

  // Log with appropriate level
  switch (level) {
    case 'debug':
      (logger as any).debug(message, data);
      break;
    case 'info':
      (logger as any).info(message, data);
      break;
    case 'warn':
      (logger as any).warn(message, data);
      break;
    case 'error':
      (logger as any).error(message, data);
      break;
    default:
      (logger as any).info(message, data);
  }
};

const cleanup = () => {
  if (eventEmitter) {
    eventEmitter.removeAllListeners('logEvent');
    eventEmitter = null;
  }
  isInitialized = false;
};

// Initialize the bridge
setupNativeLoggerBridge();

export { cleanup };
