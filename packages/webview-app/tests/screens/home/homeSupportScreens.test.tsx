// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import type React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DevRouteMenu } from '../../../src/components/DevRouteMenu';
import { SettingsScreen } from '../../../src/screens/account/SettingsScreen';
import { HomeScreen } from '../../../src/screens/home/HomeScreen';
import { IDDataScreen } from '../../../src/screens/home/IDDataScreen';
import { ManageDocumentsScreen } from '../../../src/screens/home/ManageDocumentsScreen';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const analytics = { trackEvent: vi.fn() };
const haptic = { trigger: vi.fn() };
const lifecycle = { dismiss: vi.fn() };
const documents = { loadDocumentCatalog: vi.fn(), saveDocumentCatalog: vi.fn() };

vi.mock('../../../src/providers/SelfClientProvider', () => ({
  useSelfClient: () => ({
    analytics,
    haptic,
    lifecycle,
    documents,
    custody: { lock: vi.fn(), reset: vi.fn() },
  }),
}));

vi.mock('../../../src/providers/OperatingModeProvider', () => ({
  useOperatingMode: () => ({
    mode: 'self-app',
    capabilities: {
      nfc: true,
      mrzCamera: true,
      biometrics: true,
      secureStorage: true,
      custodyControls: false,
    },
  }),
}));

vi.mock('../../../src/providers/BridgeProvider', () => ({
  useBridge: () => ({
    request: vi.fn().mockResolvedValue(null),
  }),
}));

// Keeps the suite off @selfxyz/common's ESM dist (blakejs CJS interop breaks
// under vitest externalization).
vi.mock('@selfxyz/mobile-sdk-alpha/browser', () => ({
  getDocumentAttributes: () => ({
    nameSlice: '',
    dobSlice: '',
    yobSlice: '',
    issuingStateSlice: '',
    nationalitySlice: '',
    passNoSlice: '',
    sexSlice: '',
    expiryDateSlice: '',
    isPassportType: true,
  }),
}));

vi.mock('@selfxyz/euclid', () => ({
  createSafeAreaProps: ({ top, bottom }: { top: number; bottom: number }) => ({
    insets: { top, bottom, left: 0, right: 0 },
    safeArea: { top, bottom, left: 0, right: 0 },
  }),
  ChevronRightIcon: () => null,
  GearIcon: () => null,
  LeftArrowIcon: () => null,
  PlusIcon: () => null,
  IdCardIcon: () => null,
  QuestionCircleStrokeIcon: () => null,
  DocumentDetailsIcon: () => null,
  LockIcon: () => null,
  NotificationIcon: () => null,
  ChatStrokeIcon: () => null,
  ShareIcon: () => null,
  CodeIcon: () => null,
  HomeScreen: ({
    idCard,
    onAddIdPress,
    topNavigationPrimaryButton,
  }: {
    idCard?: { title: string; subtitle: string };
    onAddIdPress: () => void;
    topNavigationPrimaryButton: { onPress: () => void };
  }) => (
    <div>
      {idCard ? <div>{`${idCard.title} ${idCard.subtitle}`}</div> : <div>No document</div>}
      <button onClick={onAddIdPress} type="button">
        Add ID
      </button>
      <button onClick={topNavigationPrimaryButton.onPress} type="button">
        Open settings
      </button>
    </div>
  ),
  SettingsViewScreen: ({ sections }: { sections: Array<{ items: Array<{ label: string; onPress: () => void }> }> }) => (
    <div>
      {sections.flatMap(section =>
        section.items.map(item => (
          <button key={item.label} onClick={item.onPress} type="button">
            {item.label}
          </button>
        )),
      )}
    </div>
  ),
  ManageDocumentsScreen: ({
    documents: docs,
    onViewIdDetails,
    onDismissDialogue,
    dialogue,
  }: {
    documents: Array<{ id: string; label: string; badge?: React.ReactNode; onPress: () => void }>;
    onViewIdDetails: () => void;
    onDismissDialogue: () => void;
    dialogue?: { title: string };
  }) => (
    <div>
      {docs.map(doc => (
        <span key={doc.id}>
          <button onClick={doc.onPress} type="button">
            {doc.label}
          </button>
          {doc.badge}
        </span>
      ))}
      {dialogue ? (
        <div>
          <div>{dialogue.title}</div>
          <button onClick={onViewIdDetails} type="button">
            View details
          </button>
          <button onClick={onDismissDialogue} type="button">
            Close dialog
          </button>
        </div>
      ) : null}
    </div>
  ),
  IDDataScreen: ({ onManageID, onClose }: { onManageID: () => void; onClose: () => void }) => (
    <div>
      <button onClick={onManageID} type="button">
        Manage ID
      </button>
      <button onClick={onClose} type="button">
        Close ID data
      </button>
    </div>
  ),
}));

const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

const renderRoutes = (initialEntries: string[]) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/docs" element={<ManageDocumentsScreen />} />
        <Route path="/docs/current" element={<IDDataScreen />} />
        <Route path="/settings/dev-mode" element={<LocationDisplay />} />
      </Routes>
      <DevRouteMenu />
      <LocationDisplay />
    </MemoryRouter>,
  );

describe('WV-14 support screens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    documents.loadDocumentCatalog.mockResolvedValue({
      documents: [
        {
          id: 'doc-1',
          documentType: 'p',
          documentCategory: 'passport',
          data: '{}',
          mock: true,
          isRegistered: true,
        },
      ],
    });
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('stitches home to settings, manage documents, and ID data', async () => {
    renderRoutes(['/']);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /open settings/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /open settings/i }));
    expect(screen.getByTestId('location').textContent).toBe('/settings');

    fireEvent.click(screen.getByRole('button', { name: /manage documents/i }));
    expect(screen.getByTestId('location').textContent).toBe('/docs');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /passport/i })).toBeTruthy();
    });
    // Tap selects in place without opening anything (mirrors the phone app).
    fireEvent.click(screen.getByRole('button', { name: /passport/i }));
    expect(documents.saveDocumentCatalog).toHaveBeenCalledWith(
      expect.objectContaining({ selectedDocumentId: 'doc-1' }),
    );
    expect(screen.queryByRole('button', { name: /view details/i })).toBeNull();
    // Details live behind the row's chevron.
    fireEvent.click(screen.getByRole('button', { name: /document details/i }));
    fireEvent.click(screen.getByRole('button', { name: /view details/i }));
    expect(screen.getByTestId('location').textContent).toBe('/docs/current');

    fireEvent.click(screen.getByRole('button', { name: /manage id/i }));
    expect(screen.getByTestId('location').textContent).toBe('/docs');
  });

  it('exposes manage documents and ID data in the dev route menu', async () => {
    renderRoutes(['/']);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /open settings/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /dev screens/i }));

    expect(screen.getByRole('button', { name: 'Manage Documents' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ID Data' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'ID Data' }));
    expect(screen.getByTestId('location').textContent).toBe('/docs/current');
  });
});
