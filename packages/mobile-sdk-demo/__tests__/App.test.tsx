// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Text } from 'react-native';
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
