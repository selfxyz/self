// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useWindowDimensions } from 'react-native';

// Figma reference screen width (iPhone 15 / standard design target)
const FIGMA_SCREEN_WIDTH = 393;

export function useResponsiveScale() {
  const { width } = useWindowDimensions();
  const scale = width / FIGMA_SCREEN_WIDTH;

  return (figmaPx: number) => figmaPx * scale;
}

export default useResponsiveScale;
