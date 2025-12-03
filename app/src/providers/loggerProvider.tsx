// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { createContext, useContext, useMemo } from 'react';

import {
  AppLogger,
  AuthLogger,
  BackupLogger,
  DocumentLogger,
  logLevels,
  MockDataLogger,
  NfcLogger,
  NotificationLogger,
  PassportLogger,
  ProofLogger,
  SettingsLogger,
} from '@/services/logging';

// Import native logger bridge first to ensure initialization order
import '@/services/logging/logger/nativeLoggerBridge';

type LoggerContextType = {
  AppLogger: typeof AppLogger;
  AuthLogger: typeof AuthLogger;
  BackupLogger: typeof BackupLogger;
  DocumentLogger: typeof DocumentLogger;
  MockDataLogger: typeof MockDataLogger;
  NfcLogger: typeof NfcLogger;
  NotificationLogger: typeof NotificationLogger;
  PassportLogger: typeof PassportLogger;
  ProofLogger: typeof ProofLogger;
  SettingsLogger: typeof SettingsLogger;
  logLevels: typeof logLevels;
};

const LoggerContext = createContext<LoggerContextType | null>(null);

export const LoggerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const value = useMemo(
    () => ({
      AppLogger,
      AuthLogger,
      BackupLogger,
      DocumentLogger,
      MockDataLogger,
      NfcLogger,
      NotificationLogger,
      PassportLogger,
      ProofLogger,
      SettingsLogger,
      logLevels,
    }),
    [],
  );
  return (
    <LoggerContext.Provider value={value}>{children}</LoggerContext.Provider>
  );
};

export const useLogger = () => {
  const loggers = useContext(LoggerContext);
  if (!loggers) {
    throw new Error('useLogger must be used within a LoggerProvider');
  }
  return loggers;
};
