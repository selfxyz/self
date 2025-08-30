// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import {View, Text} from 'react-native';

export default function App() {
  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Text style={{fontSize: 20, marginBottom: 12}}>Self Demo App</Text>
      <Text>Register Document</Text>
      <Text>Generate Mock</Text>
      <Text>Prove QR Code</Text>
    </View>
  );
}
