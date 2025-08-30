// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const React = require('react');
const { View, Text } = require('react-native');

function App() {
  return React.createElement(
    View,
    { style: { flex: 1, justifyContent: 'center', alignItems: 'center' } },
    React.createElement(Text, { style: { fontSize: 20, marginBottom: 12 } }, 'Self Demo App'),
    React.createElement(Text, null, 'Register Document'),
    React.createElement(Text, null, 'Generate Mock'),
    React.createElement(Text, null, 'Prove QR Code'),
  );
}

module.exports = { default: App };
