// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import type { configLoggerType } from 'react-native-logs';
import { logger } from 'react-native-logs';

import { interceptConsole } from './logger/consoleInterceptor';
import { lokiTransport } from './logger/lokiTransport';

import './logger/nativeLoggerBridge';

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

const defaultConfig: configLoggerType<any, any> = {
  enabled: __DEV__ ? false : true,
  severity: __DEV__ ? 'debug' : 'warn', //TODO configure this using remote-config
  transport: [lokiTransport],
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
};

const Logger = logger.createLogger(defaultConfig);

// Initialize console interceptor to route console logs to Loki
interceptConsole();

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

// Define log levels
export const logLevels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};
