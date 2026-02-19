// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useWindowDimensions } from 'react-native';
import { renderHook } from '@testing-library/react-native';

import { useResponsiveScale } from '@/hooks/useResponsiveScale';

describe('useResponsiveScale', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns identity scaling at figma width (393)', () => {
    (useWindowDimensions as jest.Mock).mockReturnValue({
      width: 393,
      height: 852,
      scale: 3,
      fontScale: 1,
    });

    const { result } = renderHook(() => useResponsiveScale());

    expect(result.current(10)).toBe(10);
    expect(result.current(98)).toBe(98);
  });

  it('scales down on smaller width (375)', () => {
    (useWindowDimensions as jest.Mock).mockReturnValue({
      width: 375,
      height: 812,
      scale: 3,
      fontScale: 1,
    });

    const { result } = renderHook(() => useResponsiveScale());

    expect(result.current(100)).toBeCloseTo((375 / 393) * 100);
    expect(result.current(16)).toBeCloseTo((375 / 393) * 16);
  });

  it('scales up on larger width (440)', () => {
    (useWindowDimensions as jest.Mock).mockReturnValue({
      width: 440,
      height: 956,
      scale: 3,
      fontScale: 1,
    });

    const { result } = renderHook(() => useResponsiveScale());

    expect(result.current(100)).toBeCloseTo((440 / 393) * 100);
    expect(result.current(24)).toBeCloseTo((440 / 393) * 24);
  });

  it('clamps at max scale (1.15) for very large screens', () => {
    (useWindowDimensions as jest.Mock).mockReturnValue({
      width: 1024,
      height: 1366,
      scale: 2,
      fontScale: 1,
    });

    const { result } = renderHook(() => useResponsiveScale());

    // Should clamp to 1.15, not 1024/393 = 2.6
    expect(result.current(100)).toBeCloseTo(115);
    expect(result.current(16)).toBeCloseTo(16 * 1.15);
  });

  it('clamps at min scale (0.85) for very small screens', () => {
    (useWindowDimensions as jest.Mock).mockReturnValue({
      width: 280,
      height: 568,
      scale: 2,
      fontScale: 1,
    });

    const { result } = renderHook(() => useResponsiveScale());

    // Should clamp to 0.85, not 280/393 = 0.71
    expect(result.current(100)).toBeCloseTo(85);
    expect(result.current(16)).toBeCloseTo(16 * 0.85);
  });
});
