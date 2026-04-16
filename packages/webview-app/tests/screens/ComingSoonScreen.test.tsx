// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import type React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ComingSoonScreen } from '../../src/screens/ComingSoonScreen';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const analytics = { trackEvent: vi.fn() };
const haptic = { trigger: vi.fn() };

vi.mock('../../src/providers/SelfClientProvider', () => ({
  useSelfClient: () => ({
    analytics,
    haptic,
  }),
}));

vi.mock('../../src/utils/countryFlags', () => ({
  getCountryName: () => '',
  renderFlag: () => null,
}));

vi.mock('@selfxyz/euclid', () => ({
  createSafeAreaProps: ({ top, bottom }: { top: number; bottom: number }) => ({
    insets: { top, bottom, left: 0, right: 0 },
    safeArea: { top, bottom, left: 0, right: 0 },
  }),
  ComingSoonScreen: ({ onBack }: { onBack: () => void }) => (
    <button onClick={onBack} type="button">
      Go back
    </button>
  ),
}));

const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
};

const renderComingSoon = (initialEntries: string[], initialIndex = initialEntries.length - 1) =>
  render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
      <Routes>
        <Route path="/coming-soon" element={<ComingSoonScreen />} />
        <Route path="/" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>,
  );

describe('ComingSoonScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('navigates to home when dismissed', () => {
    renderComingSoon(['/coming-soon']);

    fireEvent.click(screen.getByRole('button', { name: /go back/i }));

    expect(screen.getByTestId('location').textContent).toBe('/');
  });
});
