// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

/**
 * Mock console methods to reduce noise in test output.
 * Only show console output when DEBUG_TESTS environment variable is set.
 */

const originalConsole = {
  warn: console.warn,
  error: console.error,
  log: console.log,
};

const shouldShowOutput = process.env.DEBUG_TESTS === 'true';

// Mock console.warn to be quieter in tests
console.warn = (...args: any[]) => {
  if (shouldShowOutput) {
    originalConsole.warn(...args);
  }
};

// Keep errors visible but less noisy format
console.error = (...args: any[]) => {
  if (shouldShowOutput) {
    originalConsole.error(...args);
  } else {
    // Only show error in CI or when debugging
    if (process.env.CI || process.env.NODE_ENV === 'test') {
      // Silently capture errors for CI
      return;
    }
    originalConsole.error(...args);
  }
};

// Restore original console methods if needed
export const restoreConsole = () => {
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.log = originalConsole.log;
};
