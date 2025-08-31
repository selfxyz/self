// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import renderer from 'react-test-renderer';
import { Text } from 'react-native';
import App from '../App';

test('renders menu items', () => {
  const rendered = renderer.create(<App />);
  const texts = rendered.root.findAllByType(Text).map(node => React.Children.toArray(node.props.children).join(''));
  const expected = ['Self Demo App', 'Register Document', 'Generate Mock', 'Prove QR Code'];
  expect(texts).toEqual(expect.arrayContaining(expected));
  expect(texts).toHaveLength(expected.length);
  rendered.unmount();
});
