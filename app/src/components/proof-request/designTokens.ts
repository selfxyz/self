// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Design tokens for proof request components.
 * Extracted from Figma design 15234:9267 and 15234:9322.
 */

export const proofRequestColors = {
  // Base colors
  black: '#000000',
  white: '#FFFFFF',

  // Slate palette
  slate100: '#F8FAFC',
  slate200: '#E2E8F0',
  slate400: '#94A3B8',
  slate500: '#71717A',
  slate900: '#0F172A',

  // Blue palette
  blue500: '#3B82F6',
  blue600: '#2563EB',
  blue700: '#1D4ED8',

  // Status colors
  emerald500: '#10B981',

  // Zinc palette
  zinc500: '#71717A',
} as const;

export const proofRequestSpacing = {
  cardPadding: 20,
  headerPadding: 30,
  itemPadding: 16,
  borderRadius: 10,
  borderRadiusSmall: 4,
} as const;
