// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { ComponentType } from 'react';

import type { IDDocument } from '@selfxyz/common/dist/esm/src/utils/types.js';

export type ScreenId = 'generate' | 'register' | 'prove' | 'camera' | 'nfc' | 'qr' | 'documents' | 'activity';

export type ScreenContext = {
  navigate: (next: ScreenRoute) => void;
  goHome: () => void;
  mockDocument: IDDocument | null;
  setMockDocument: (document: IDDocument | null) => void;
};

export type ScreenStatus = 'working' | 'placeholder';

export type ScreenDescriptor = {
  id: ScreenId;
  title: string;
  subtitle?: string | ((context: ScreenContext) => string | undefined);
  sectionTitle: string;
  status: ScreenStatus;
  getStatus?: (context: ScreenContext) => ScreenStatus;
  isDisabled?: (context: ScreenContext) => boolean;
  load: () => ComponentType<any>;
  getProps?: (context: ScreenContext) => Record<string, unknown>;
};

export type ScreenRoute = 'home' | ScreenId;

export const screenDescriptors: ScreenDescriptor[] = [
  {
    id: 'generate',
    title: 'Generate Mock Document',
    subtitle: 'Create sample passport data for testing',
    sectionTitle: '⭐ Core Features',
    status: 'working',
    load: () => require('./GenerateMock').default,
    getProps: ({ setMockDocument, navigate }) => ({
      onGenerate: setMockDocument,
      onNavigate: navigate,
      onBack: () => navigate('home'),
    }),
  },
  {
    id: 'register',
    title: 'Register Document',
    sectionTitle: '⭐ Core Features',
    status: 'placeholder',
    subtitle: ({ mockDocument }) =>
      mockDocument ? 'View the mock document registration flow' : 'Generate mock data to unlock this demo',
    getStatus: ({ mockDocument }) => (mockDocument ? 'working' : 'placeholder'),
    isDisabled: ({ mockDocument }) => !mockDocument,
    load: () => require('./RegisterDocument').default,
    getProps: ({ mockDocument, navigate }) => ({
      document: mockDocument,
      onBack: () => navigate('home'),
    }),
  },
  {
    id: 'camera',
    title: 'Document MRZ',
    subtitle: 'Scan passport or ID card using your device camera',
    sectionTitle: '📸 Scanning',
    status: 'placeholder',
    load: () => require('./DocumentCamera').default,
    getProps: ({ navigate }) => ({ onBack: () => navigate('home') }),
  },
  {
    id: 'nfc',
    title: 'Document NFC',
    subtitle: 'Read encrypted data from NFC-enabled documents',
    sectionTitle: '📸 Scanning',
    status: 'placeholder',
    load: () => require('./DocumentNFCScan').default,
    getProps: ({ navigate }) => ({ onBack: () => navigate('home') }),
  },
  {
    id: 'qr',
    title: 'QR Code Proof',
    subtitle: 'Scan QR codes to receive or share verification proofs',
    sectionTitle: '📸 Scanning',
    status: 'placeholder',
    load: () => require('./QRCodeViewFinder').default,
    getProps: ({ navigate }) => ({ onBack: () => navigate('home') }),
  },
  {
    id: 'documents',
    title: 'Document List',
    sectionTitle: '📋 Your Data',
    status: 'placeholder',
    subtitle: 'View all registered identity documents',
    load: () => require('./DocumentsList').default,
    getProps: ({ navigate }) => ({ onBack: () => navigate('home') }),
  },
  {
    id: 'activity',
    title: 'Proof History',
    sectionTitle: '📋 Your Data',
    status: 'placeholder',
    subtitle: 'Track your verification and proof activities',
    load: () => require('./ProofHistory').default,
    getProps: ({ navigate }) => ({ onBack: () => navigate('home') }),
  },
];

export const screenMap = screenDescriptors.reduce<Record<ScreenId, ScreenDescriptor>>(
  (map, descriptor) => {
    map[descriptor.id] = descriptor;
    return map;
  },
  {} as Record<ScreenId, ScreenDescriptor>,
);

export const orderedSectionEntries = screenDescriptors.reduce<Array<{ title: string; items: ScreenDescriptor[] }>>(
  (sections, descriptor) => {
    const existingSection = sections.find(section => section.title === descriptor.sectionTitle);

    if (existingSection) {
      existingSection.items.push(descriptor);
      return sections;
    }

    sections.push({ title: descriptor.sectionTitle, items: [descriptor] });
    return sections;
  },
  [],
);
