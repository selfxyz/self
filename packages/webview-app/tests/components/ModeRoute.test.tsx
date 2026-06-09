// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import type React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ModeRoute } from '../../src/components/ModeRoute';

import { cleanup, render, screen, waitFor } from '@testing-library/react';

const setResult = vi.fn().mockResolvedValue(undefined);
const dismiss = vi.fn().mockResolvedValue(undefined);

let currentMode: 'self-app' | 'embed' = 'self-app';

vi.mock('../../src/providers/OperatingModeProvider', () => ({
  useOperatingMode: () => ({ mode: currentMode, verificationRequest: null, isReady: true }),
}));

vi.mock('../../src/providers/SelfClientProvider', () => ({
  useSelfClient: () => ({
    lifecycle: { setResult, dismiss },
  }),
}));

const Marker: React.FC = () => <div data-testid="screen">visible</div>;

const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

const renderRoute = (mode: 'self-app' | 'embed' | 'shared' | 'dev') =>
  render(
    <MemoryRouter initialEntries={['/x']}>
      <Routes>
        {ModeRoute({ mode, path: '/x', element: <Marker /> })}
        <Route path="/" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>,
  );

describe('ModeRoute', () => {
  beforeEach(() => {
    setResult.mockClear();
    dismiss.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('mode=self-app + currentMode=self-app → renders element', () => {
    currentMode = 'self-app';
    renderRoute('self-app');
    expect(screen.getByTestId('screen').textContent).toBe('visible');
    expect(setResult).not.toHaveBeenCalled();
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('mode=self-app + currentMode=embed → fires setResult+dismiss and renders nothing', async () => {
    currentMode = 'embed';
    renderRoute('self-app');
    expect(screen.queryByTestId('screen')).toBeNull();
    await waitFor(() => {
      expect(setResult).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'route_not_allowed',
          message: 'This route is not available in embed mode.',
        },
      });
      expect(dismiss).toHaveBeenCalledWith({ reason: 'user_cancel' });
    });
  });

  it('mode=embed + currentMode=self-app → redirects to /', () => {
    currentMode = 'self-app';
    renderRoute('embed');
    expect(screen.queryByTestId('screen')).toBeNull();
    expect(screen.getByTestId('location').textContent).toBe('/');
    expect(setResult).not.toHaveBeenCalled();
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('mode=embed + currentMode=embed → renders element', () => {
    currentMode = 'embed';
    renderRoute('embed');
    expect(screen.getByTestId('screen').textContent).toBe('visible');
    expect(setResult).not.toHaveBeenCalled();
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('mode=shared renders element in self-app', () => {
    currentMode = 'self-app';
    renderRoute('shared');
    expect(screen.getByTestId('screen').textContent).toBe('visible');
  });

  it('mode=shared renders element in embed', () => {
    currentMode = 'embed';
    renderRoute('shared');
    expect(screen.getByTestId('screen').textContent).toBe('visible');
  });

  it('mode=dev renders element in self-app', () => {
    currentMode = 'self-app';
    renderRoute('dev');
    expect(screen.getByTestId('screen').textContent).toBe('visible');
  });

  it('mode=dev renders element in embed', () => {
    currentMode = 'embed';
    renderRoute('dev');
    expect(screen.getByTestId('screen').textContent).toBe('visible');
  });
});
