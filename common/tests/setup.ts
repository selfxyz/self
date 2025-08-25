// Vitest setup file for common package tests
import { vi } from 'vitest';

// Global test setup
global.vi = vi;

// Mock any global objects that might be needed
global.Buffer = Buffer;
