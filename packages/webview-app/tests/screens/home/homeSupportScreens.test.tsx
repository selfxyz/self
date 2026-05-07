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
const documents = { loadDocumentCatalog: vi.fn() };

vi.mock('../../../src/providers/SelfClientProvider', () => ({
  useSelfClient: () => ({
    analytics,
    haptic,
    lifecycle,
    documents,
  }),
}));

vi.mock('@selfxyz/mobile-sdk-alpha/browser', () => ({
  getPerkRecordsForIdType: () => [],
}));

vi.mock('@selfxyz/euclid', () => ({
  createSafeAreaProps: ({ top, bottom }: { top: number; bottom: number }) => ({
    insets: { top, bottom, left: 0, right: 0 },
    safeArea: { top, bottom, left: 0, right: 0 },
  }),
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

  TopNavigationDialogue: ({ onEscape }: { onEscape: () => void }) => (
    <button onClick={onEscape} type="button">Close ID data</button>
  ),
  ExposedIDCard: () => <div>ID card</div>,
  IdentificationDetailsCard: () => <div>Identification details</div>,
  DetailedTableView: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DetailedTableViewCell: ({ label }: { label: string }) => <div>{label}</div>,
  Button: ({ onPress, text }: { onPress: () => void; text: string }) => (
    <button onClick={onPress} type="button">{text}</button>
  ),

  ManageDocumentsScreen: ({
    documents: docs,
    onViewIdDetails,
    onDismissDialogue,
    dialogue,
  }: {
    documents: Array<{ id: string; label: string; onPress: () => void }>;
    onViewIdDetails: () => void;
    onDismissDialogue: () => void;
    dialogue?: { title: string };
  }) => (
    <div>
      {docs.map(doc => (
        <button key={doc.id} onClick={doc.onPress} type="button">
          {doc.label}
        </button>
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
        <Route path="/manage-documents" element={<ManageDocumentsScreen />} />
        <Route path="/id-data" element={<IDDataScreen />} />
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
    expect(screen.getByTestId('location').textContent).toBe('/manage-documents');

    fireEvent.click(screen.getByRole('button', { name: /passport/i }));
    expect(screen.getByTestId('location').textContent).toBe('/id-data');

    fireEvent.click(screen.getByRole('button', { name: /manage id/i }));
    expect(screen.getByTestId('location').textContent).toBe('/manage-documents');
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
    expect(screen.getByTestId('location').textContent).toBe('/id-data');
  });
});
