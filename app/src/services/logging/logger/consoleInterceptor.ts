// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Store original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

type LoggerMethods = {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

const interceptConsole = (appLogger: LoggerMethods) => {
  console.log = (...args: unknown[]) => {
    appLogger.info(...args);
    originalConsole.log(...args);
  };

  console.info = (...args: unknown[]) => {
    appLogger.info(...args);
    originalConsole.info(...args);
  };

  console.warn = (...args: unknown[]) => {
    appLogger.warn(...args);
    originalConsole.warn(...args);
  };

  console.error = (...args: unknown[]) => {
    appLogger.error(...args);
    originalConsole.error(...args);
  };

  console.debug = (...args: unknown[]) => {
    appLogger.debug(...args);
    originalConsole.debug(...args);
  };
};

const restoreConsole = () => {
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.debug = originalConsole.debug;
};

export { interceptConsole, restoreConsole };
