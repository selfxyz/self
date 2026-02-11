// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useWindowDimensions } from 'react-native';

const CARD_WIDTH_FACTOR = 0.95;
const CARD_HORIZONTAL_OFFSET = 16;

// Figma reference dimensions
const FIGMA_CARD_WIDTH = 353;
const FIGMA_CARD_HEIGHT = 224;
const FIGMA_HEADER_HEIGHT = 67;
const FIGMA_PADDING = 14;
const FIGMA_LOGO_SIZE = 32;
const FIGMA_HEADER_GAP = 12;
const FIGMA_HEADER_FONT_SIZE = 20;
const FIGMA_SUBTITLE_FONT_SIZE = 7;
const FIGMA_BADGE_FONT_SIZE = 10;
const FIGMA_BOTTOM_LABEL_FONT_SIZE = 15;
const FIGMA_BOTTOM_ID_FONT_SIZE = 10;
const FIGMA_BUTTON_FONT_SIZE = 16;
const FIGMA_BORDER_RADIUS = 12;

export interface CardFontSizes {
  header: number;
  subtitle: number;
  badge: number;
  bottomLabel: number;
  bottomId: number;
  button: number;
}

export interface CardDimensions {
  cardWidth: number;
  cardHeight: number;
  borderRadius: number;
  scale: number;
  headerHeight: number;
  figmaPadding: number;
  logoSize: number;
  headerGap: number;
  expandedAspectRatio: number;
  collapsedAspectRatio: number;
  fontSize: CardFontSizes;
}

export function useCardDimensions(selected = true): CardDimensions {
  const { width } = useWindowDimensions();

  const cardWidth = width * CARD_WIDTH_FACTOR - CARD_HORIZONTAL_OFFSET;
  const scale = cardWidth / FIGMA_CARD_WIDTH;

  const expandedAspectRatio = FIGMA_CARD_WIDTH / FIGMA_CARD_HEIGHT;
  const collapsedAspectRatio = FIGMA_CARD_WIDTH / FIGMA_HEADER_HEIGHT;

  return {
    cardWidth,
    cardHeight: selected
      ? cardWidth / expandedAspectRatio
      : cardWidth / collapsedAspectRatio,
    borderRadius: FIGMA_BORDER_RADIUS,
    scale,
    headerHeight: FIGMA_HEADER_HEIGHT * scale,
    figmaPadding: FIGMA_PADDING * scale,
    logoSize: FIGMA_LOGO_SIZE * scale,
    headerGap: FIGMA_HEADER_GAP * scale,
    expandedAspectRatio,
    collapsedAspectRatio,
    fontSize: {
      header: FIGMA_HEADER_FONT_SIZE * scale,
      subtitle: FIGMA_SUBTITLE_FONT_SIZE * scale,
      badge: FIGMA_BADGE_FONT_SIZE * scale,
      bottomLabel: FIGMA_BOTTOM_LABEL_FONT_SIZE * scale,
      bottomId: FIGMA_BOTTOM_ID_FONT_SIZE * scale,
      button: FIGMA_BUTTON_FONT_SIZE * scale,
    },
  };
}

export default useCardDimensions;
