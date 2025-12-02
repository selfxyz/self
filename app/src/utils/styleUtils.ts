// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Utility functions for style, design, and layout operations.
 */

/**
 * Extra vertical padding constant for layouts
 */
export const extraYPadding = 15;

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
