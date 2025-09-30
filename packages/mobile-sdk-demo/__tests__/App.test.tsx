// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import renderer from 'react-test-renderer';

import App from '../App';
import { screenDescriptors } from '../src/screens';

test('renders menu buttons', () => {
  const rendered = renderer.create(<App />);
  const textNodes = rendered.root.findAllByType(Text);

  expect(textNodes.some(node => node.props.children === 'Self Demo App')).toBe(true);

  screenDescriptors.forEach(descriptor => {
    expect(textNodes.some(node => node.props.children === descriptor.title)).toBe(true);
  });

  rendered.unmount();
});

test('register button is gated until mock data exists', () => {
  const rendered = renderer.create(<App />);
  const buttons = rendered.root.findAllByType(TouchableOpacity);

  const findButtonByLabel = (label: string) =>
    buttons.find(button => button.findAllByType(Text).some(node => node.props.children === label));

  const registerButton = findButtonByLabel('Register Document');
  const proveButton = findButtonByLabel('QR Code Proof');

  expect(registerButton).toBeDefined();
  expect(registerButton?.props.disabled).toBe(true);
  expect(proveButton).toBeDefined();
  expect(proveButton?.props.disabled).toBe(false); // QR Code Proof is not disabled

  rendered.unmount();
});

test('navigates to a screen using the registry loader', () => {
  const rendered = renderer.create(<App />);

  const buttons = rendered.root.findAllByType(TouchableOpacity);
  const cameraButton = buttons.find(button =>
    button.findAllByType(Text).some(node => node.props.children === 'Document MRZ'),
  );

  expect(cameraButton).toBeDefined();
  cameraButton?.props.onPress();

  const backButtons = rendered.root.findAllByType(TouchableOpacity);
  const backButton = backButtons.find(button =>
    button.findAllByType(Text).some(node => node.props.children === '← Back'),
  );
  expect(backButton).toBeDefined();

  rendered.unmount();
});
