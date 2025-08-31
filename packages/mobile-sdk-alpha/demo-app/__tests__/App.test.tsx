// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import renderer from 'react-test-renderer';
import { Button, Text } from 'react-native';
import App from '../App';

test('renders menu buttons', () => {
  const rendered = renderer.create(<App />);
  const titleNode = rendered.root.findAllByType(Text).find(node => node.props.children === 'Self Demo App');
  expect(titleNode).toBeTruthy();
  const buttons = rendered.root.findAllByType(Button);
  const titles = buttons.map(b => b.props.title);
  expect(titles).toEqual(['Register Document', 'Generate Mock', 'Prove QR Code']);
  rendered.unmount();
});
