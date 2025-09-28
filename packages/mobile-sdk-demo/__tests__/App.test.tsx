// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import renderer from 'react-test-renderer';

import App from '../App';

test('renders menu buttons', () => {
  const rendered = renderer.create(<App />);
  const textNodes = rendered.root.findAllByType(Text);

  expect(textNodes.some(node => node.props.children === 'Self Demo App')).toBe(true);

  ['✅ Generate Mock Data', '⏳ Register Document', '⏳ Prove QR Code'].forEach(label => {
    expect(textNodes.some(node => node.props.children === label)).toBe(true);
  });

  rendered.unmount();
});

test('register and prove buttons are gated until mock data exists', () => {
  const rendered = renderer.create(<App />);
  const buttons = rendered.root.findAllByType(TouchableOpacity);

  const findButtonByLabel = (label: string) =>
    buttons.find(button => button.findAllByType(Text).some(node => node.props.children === label));

  const registerButton = findButtonByLabel('⏳ Register Document');
  const proveButton = findButtonByLabel('⏳ Prove QR Code');

  expect(registerButton).toBeDefined();
  expect(registerButton?.props.disabled).toBe(true);
  expect(proveButton).toBeDefined();
  expect(proveButton?.props.disabled).toBe(true);

  rendered.unmount();
});
