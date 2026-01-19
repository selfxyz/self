// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import {
  type configLoggerType,
  type defLvlType,
  logger,
  type transportFunctionType,
} from 'react-native-logs';

import { interceptConsole } from '@/services/logging/logger/consoleInterceptor';
import { lokiTransport } from '@/services/logging/logger/lokiTransport';
import { setupNativeLoggerBridge } from '@/services/logging/logger/nativeLoggerBridge';
import { useSettingStore } from '@/stores/settingStore';

// Read initial logging severity from settings store
const initialSeverity = useSettingStore.getState().loggingSeverity;

const defaultConfig: configLoggerType<
  transportFunctionType<object> | transportFunctionType<object>[],
  defLvlType
> = {
  enabled: __DEV__ ? false : true,
  severity: initialSeverity,
  transport: [lokiTransport as unknown as transportFunctionType<object>],
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

type RootLogger = typeof Logger;
type LoggerExtension = ReturnType<RootLogger['extend']>;

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

// Subscribe to settings store changes to update logger severity dynamically
let previousSeverity = initialSeverity;
useSettingStore.subscribe(state => {
  if (state.loggingSeverity !== previousSeverity) {
    Logger.setSeverity(state.loggingSeverity);
    previousSeverity = state.loggingSeverity;
  }
});

// Initialize console interceptor to route console logs to Loki
interceptConsole(AppLogger);

// Define log levels
const logLevels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Initialize native logger bridge after all loggers are defined
// This avoids module cycle by injecting dependencies instead of importing them
setupNativeLoggerBridge({ AppLogger, NfcLogger, Logger });

export type { LoggerExtension, RootLogger };

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
  logLevels,
};
