// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Button, Text, TouchableOpacity } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import { calculateContentHash, type IDDocument } from '@selfxyz/common';
import type { SelfClient } from '@selfxyz/mobile-sdk-alpha';
import * as MobileSdkAlpha from '@selfxyz/mobile-sdk-alpha';

import App from '../App';
import { SelfClientProvider, useSelfClient } from '../src/selfClient/Provider';

const mockDocument: IDDocument = {
  documentType: 'mock_passport',
  documentCategory: 'passport',
  mrz: 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<',
  mock: true,
  dsc: '',
  eContent: [],
  signedAttr: [],
  encryptedDigest: [],
};

beforeEach(() => {
  jest.restoreAllMocks();
  jest.spyOn(MobileSdkAlpha, 'generateMockDocument').mockResolvedValue(mockDocument);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('renders menu buttons', () => {
  const rendered = renderer.create(
    <SelfClientProvider>
      <App />
    </SelfClientProvider>,
  );
  const textNodes = rendered.root.findAllByType(Text);

  expect(textNodes.some(node => node.props.children === 'Self Demo App')).toBe(true);

  ['✅ Generate Mock Data', '⏳ Register Document', '⏳ Prove QR Code'].forEach(label => {
    expect(textNodes.some(node => node.props.children === label)).toBe(true);
  });

  rendered.unmount();
});

function CaptureSelfClient({ onCapture }: { onCapture: (client: SelfClient) => void }) {
  const client = useSelfClient();
  onCapture(client);
  return null;
}

test('generating a mock stores a catalog entry and unlocks gated screens', async () => {
  let capturedClient: SelfClient | null = null;

  const rendered = renderer.create(
    <SelfClientProvider>
      <>
        <CaptureSelfClient onCapture={client => (capturedClient = client)} />
        <App />
      </>
    </SelfClientProvider>,
  );

  const generateMenuButton = rendered.root
    .findAllByType(TouchableOpacity)
    .find(node => node.findByType(Text).props.children === '✅ Generate Mock Data');
  expect(generateMenuButton).toBeTruthy();

  await act(async () => {
    generateMenuButton!.props.onPress();
  });

  const generateButton = rendered.root.findByProps({ title: 'Generate' }) as renderer.ReactTestInstance & {
    props: Button['props'];
  };

  await act(async () => {
    await generateButton.props.onPress();
  });

  const successMessage = rendered.root
    .findAllByType(Text)
    .find(node => typeof node.props.children === 'string' && node.props.children.includes('Saved 1 document'));
  expect(successMessage).toBeTruthy();

  const backButton = rendered.root.findAllByType(Button).find(btn => btn.props.title === 'Back');
  expect(backButton).toBeTruthy();

  await act(async () => {
    await backButton!.props.onPress();
  });

  const textNodes = rendered.root.findAllByType(Text);
  expect(textNodes.some(node => node.props.children === '✅ Register Document')).toBe(true);
  expect(textNodes.some(node => node.props.children === '✅ Prove QR Code')).toBe(true);

  expect(capturedClient).not.toBeNull();
  const catalog = await capturedClient!.loadDocumentCatalog();
  expect(catalog.documents).toHaveLength(1);
  expect(catalog.documents[0]?.id).toBe(calculateContentHash(mockDocument));

  rendered.unmount();
});
