// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { AppLogger } from '../logger';

// Store original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

const interceptConsole = () => {
  console.log = (...args: any[]) => {
    AppLogger.info(...args);
    originalConsole.log(...args);
  };

  console.info = (...args: any[]) => {
    AppLogger.info(...args);
    originalConsole.info(...args);
  };

  console.warn = (...args: any[]) => {
    AppLogger.warn(...args);
    originalConsole.warn(...args);
  };

  console.error = (...args: any[]) => {
    AppLogger.error(...args);
    originalConsole.error(...args);
  };

  console.debug = (...args: any[]) => {
    AppLogger.debug(...args);
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
