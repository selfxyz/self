// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Mock PixelRatio module for Jest tests
module.exports = {
  get: jest.fn(() => 2),
  getFontScale: jest.fn(() => 1),
  getPixelSizeForLayoutSize: jest.fn(layoutSize => layoutSize * 2),
  roundToNearestPixel: jest.fn(layoutSize => Math.round(layoutSize * 2) / 2),
  startDetecting: jest.fn(),
};
