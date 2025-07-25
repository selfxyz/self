// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import './logger/nativeLoggerBridge';

import { configLoggerType, consoleTransport, logger } from 'react-native-logs';

import { lokiTransport } from './logger/lokiTransport';

// Define log levels
export const logLevels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const shouldUseLokiTransport = (): boolean => {
  if (__DEV__) {
    return false;
  }
  return true;
};

const defaultConfig: configLoggerType<any, any> = {
  severity: __DEV__ ? 'debug' : 'warn', //TODO configure this using remote-config
  transport: shouldUseLokiTransport()
    ? [consoleTransport, lokiTransport]
    : consoleTransport,
  transportOptions: {
    colors: {
      info: 'blueBright',
      warn: 'yellowBright',
      error: 'redBright',
    },
  },
  async: true,
  dateFormat: 'time',
  printLevel: true,
  printDate: true,
  enabled: true,
};

const Logger = logger.createLogger(defaultConfig);

// loggers based on src/consts/analytics.ts
const AppLogger = Logger.extend('APP');
const NotificationLogger = Logger.extend('NOTIFICATION');
const AuthLogger = Logger.extend('AUTH');
const PassportLogger = Logger.extend('PASSPORT');
const ProofLogger = Logger.extend('PROOF');
const SettingsLogger = Logger.extend('SETTINGS');
const BackupLogger = Logger.extend('BACKUP');
const MockDataLogger = Logger.extend('MOCK_DATA');
const DocumentLogger = Logger.extend('DOCUMENT');

//Native Modules
const NfcLogger = Logger.extend('NFC');

export {
  AppLogger,
  AuthLogger,
  BackupLogger,
  DocumentLogger,
  Logger,
  MockDataLogger,
  NfcLogger,
  NotificationLogger,
  PassportLogger,
  ProofLogger,
  SettingsLogger,
};
