// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { ComponentType } from 'react';

import type { DocumentCatalog, DocumentMetadata, IDDocument } from '@selfxyz/common/dist/esm/src/utils/types.js';

export type ScreenId = 'generate' | 'register' | 'prove' | 'camera' | 'nfc' | 'documents';

export type ScreenContext = {
  navigate: (next: ScreenRoute) => void;
  goHome: () => void;
  documentCatalog: DocumentCatalog;
  selectedDocument: { data: IDDocument; metadata: DocumentMetadata } | null;
  refreshDocuments: () => Promise<void>;
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
    sectionTitle: '⭐ Mock Documents',
    status: 'working',
    load: () => require('./GenerateMock').default,
    getProps: ({ refreshDocuments, navigate }) => ({
      onDocumentStored: refreshDocuments,
      onNavigate: navigate,
      onBack: () => navigate('home'),
    }),
  },
  {
    id: 'register',
    title: 'Register Document',
    sectionTitle: '⭐ Mock Documents',
    status: 'placeholder',
    subtitle: ({ selectedDocument }) =>
      selectedDocument ? 'View the most recently generated mock document' : 'Generate mock data to unlock this demo',
    getStatus: ({ selectedDocument }) => (selectedDocument ? 'working' : 'placeholder'),
    isDisabled: ({ selectedDocument }) => !selectedDocument,
    load: () => require('./RegisterDocument').default,
    getProps: ({ selectedDocument, navigate }) => ({
      document: selectedDocument?.data ?? null,
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
    id: 'documents',
    title: 'Document List',
    sectionTitle: '📋 Your Data',
    status: 'working',
    subtitle: ({ documentCatalog }) => {
      const count = documentCatalog.documents.length;
      if (count === 0) {
        return 'No documents stored yet';
      }
      if (count === 1) {
        return '1 document in your demo vault';
      }
      return `${count} documents in your demo vault`;
    },
    load: () => require('./DocumentsList').default,
    getProps: ({ navigate, documentCatalog }) => ({
      onBack: () => navigate('home'),
      catalog: documentCatalog,
    }),
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
