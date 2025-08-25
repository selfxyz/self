// Vitest setup file for common package tests
import { vi } from 'vitest';

// Global test setup
global.vi = vi;

// Node environment already provides Buffer; avoid overriding it.
// If you later switch to a browser-like test env, guard before assigning:
// if (typeof globalThis.Buffer === 'undefined') {
//   globalThis.Buffer = (await import('buffer')).Buffer;
// }
