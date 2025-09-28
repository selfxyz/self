// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Button, Text, TouchableOpacity } from 'react-native';
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

test('navigates to a screen using the registry loader', () => {
  const rendered = renderer.create(<App />);

  const buttons = rendered.root.findAllByType(TouchableOpacity);
  const cameraButton = buttons.find(button =>
    button.findAllByType(Text).some(node => node.props.children === '⏳ Document Camera')
  );

  expect(cameraButton).toBeDefined();
  cameraButton?.props.onPress();

  const nativeButtons = rendered.root.findAllByType(Button);
  expect(nativeButtons.some(node => node.props.title === 'Back to Menu')).toBe(true);

  rendered.unmount();
});
