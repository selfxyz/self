// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { ComponentType } from 'react';

import type { DocumentCatalog, DocumentMetadata, IDDocument } from '@selfxyz/common/utils/types';

export type ScreenId =
  | 'home'
  | 'generate'
  | 'register'
  | 'mrz'
  | 'nfc'
  | 'documents'
  | 'success'
  | 'country-selection'
  | 'id-selection';

export type ScreenContext = {
  navigate: (next: ScreenRoute, params?: any) => void;
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
  getProps?: (context: ScreenContext, params?: any) => Record<string, unknown>;
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
    subtitle: 'Register your document on-chain',
    sectionTitle: '⭐ Mock Documents',
    status: 'working',
    load: () => require('./RegisterDocument').default,
    getProps: ({ navigate, documentCatalog, refreshDocuments }) => ({
      catalog: documentCatalog,
      onBack: () => navigate('home'),
      onSuccess: refreshDocuments,
    }),
  },
  {
    id: 'mrz',
    title: 'Document MRZ',
    subtitle: 'Scan passport or ID card using your device camera',
    sectionTitle: '📸 Scanning',
    status: 'working',
    load: () => require('./DocumentCamera').default,
    getProps: ({ navigate }) => ({
      onBack: () => navigate('home'),
      onSuccess: () => navigate('nfc'),
    }),
  },
  {
    id: 'nfc',
    title: 'Document NFC',
    subtitle: 'Read encrypted data from NFC-enabled documents',
    sectionTitle: '📸 Scanning',
    status: 'working',
    load: () => require('./DocumentNFCScan').default,
    getProps: ({ navigate }) => ({
      onBack: () => navigate('home'),
      onNavigate: (screen: string, params?: any) => navigate(screen as ScreenRoute, params),
    }),
  },
  {
    id: 'success',
    title: 'Scan Success',
    subtitle: 'Document verification successful',
    sectionTitle: '📸 Scanning',
    status: 'working',
    load: () => require('./DocumentScanSuccess').default,
    getProps: ({ navigate }, params?: any) => ({
      onBack: () => navigate('home'),
      onNavigate: (screen: string) => navigate(screen as ScreenRoute),
      document: params?.document,
    }),
  },
  {
    id: 'documents',
    title: 'Document List',
    subtitle: 'View and manage stored documents',
    sectionTitle: '📋 Your Data',
    status: 'working',
    load: () => require('./DocumentsList').default,
    getProps: ({ navigate, documentCatalog }) => ({
      onBack: () => navigate('home'),
      catalog: documentCatalog,
    }),
  },
  {
    id: 'country-selection',
    title: 'Country Selection',
    subtitle: 'Select the country that issued your ID',
    sectionTitle: '📋 Selection',
    status: 'working',
    load: () => require('./CountrySelection').default,
    getProps: ({ navigate, documentCatalog }) => ({
      onBack: () => navigate('home'),
      catalog: documentCatalog,
    }),
  },
  {
    id: 'id-selection',
    title: 'ID Selection',
    subtitle: 'Choose the type of ID you want to verify',
    sectionTitle: '📋 Selection',
    status: 'working',
    load: () => require('./IDSelection').default,
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
