// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

/**
 * Utility functions for style, design, and layout operations.
 */

/**
 * Normalizes borderWidth value.
 * Validates and converts borderWidth to a non-negative number or undefined.
 * @param borderWidth - The borderWidth value to normalize
 * @returns Normalized borderWidth (non-negative number) or undefined
 */
export function normalizeBorderWidth(borderWidth: unknown): number | undefined {
  if (typeof borderWidth === 'number' && borderWidth >= 0) {
    return borderWidth;
  }
  return undefined;
}
