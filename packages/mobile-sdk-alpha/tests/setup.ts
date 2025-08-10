/**
 * Vitest setup file for mobile-sdk-alpha tests
 * Reduces console noise during testing
 */

const originalConsole = {
  warn: console.warn,
  error: console.error,
  log: console.log,
};

const shouldShowOutput = process.env.DEBUG_TESTS === 'true';

// Suppress console noise in tests unless explicitly debugging
if (!shouldShowOutput) {
  console.warn = () => {}; // Suppress warnings
  console.error = () => {}; // Suppress errors
  console.log = () => {}; // Suppress logs
}

// Restore console for debugging if needed
if (typeof global !== 'undefined') {
  (global as any).restoreConsole = () => {
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.log = originalConsole.log;
  };
}
