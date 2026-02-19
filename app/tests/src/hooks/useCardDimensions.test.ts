// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useWindowDimensions } from 'react-native';
import { renderHook } from '@testing-library/react-native';

import { useCardDimensions } from '@/hooks/useCardDimensions';

const CARD_WIDTH_FACTOR = 0.95;
const CARD_HORIZONTAL_OFFSET = 16;
const FIGMA_CARD_WIDTH = 353;
const FIGMA_CARD_HEIGHT = 224;
const FIGMA_HEADER_HEIGHT = 67;
const FIGMA_BORDER_RADIUS = 12;
const FIGMA_SCREEN_WIDTH = 393;

describe('useCardDimensions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses shared screen scale and scales border radius', () => {
    const width = 375;
    const expectedScale = width / FIGMA_SCREEN_WIDTH;

    (useWindowDimensions as jest.Mock).mockReturnValue({
      width,
      height: 812,
      scale: 3,
      fontScale: 1,
    });

    const { result } = renderHook(() => useCardDimensions(true));

    expect(result.current.scale).toBeCloseTo(expectedScale);
    expect(result.current.borderRadius).toBeCloseTo(
      FIGMA_BORDER_RADIUS * expectedScale,
    );
  });

  it('computes expanded card height from card width', () => {
    const width = 393;
    const expectedCardWidth =
      width * CARD_WIDTH_FACTOR - CARD_HORIZONTAL_OFFSET;
    const expectedHeight =
      expectedCardWidth / (FIGMA_CARD_WIDTH / FIGMA_CARD_HEIGHT);

    (useWindowDimensions as jest.Mock).mockReturnValue({
      width,
      height: 852,
      scale: 3,
      fontScale: 1,
    });

    const { result } = renderHook(() => useCardDimensions(true));

    expect(result.current.cardWidth).toBeCloseTo(expectedCardWidth);
    expect(result.current.cardHeight).toBeCloseTo(expectedHeight);
  });

  it('computes collapsed card height from header aspect ratio', () => {
    const width = 440;
    const expectedCardWidth =
      width * CARD_WIDTH_FACTOR - CARD_HORIZONTAL_OFFSET;
    const expectedHeight =
      expectedCardWidth / (FIGMA_CARD_WIDTH / FIGMA_HEADER_HEIGHT);

    (useWindowDimensions as jest.Mock).mockReturnValue({
      width,
      height: 956,
      scale: 3,
      fontScale: 1,
    });

    const { result } = renderHook(() => useCardDimensions(false));

    expect(result.current.cardHeight).toBeCloseTo(expectedHeight);
  });
});
