// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Button, Text, View } from 'react-native';

type Props = {
  document: Record<string, unknown> | null;
  onBack: () => void;
};

export default function RegisterDocument({ document, onBack }: Props) {
  return (
    <View>
      <Text>Register document flow not implemented</Text>
      {document && <Text selectable>{JSON.stringify(document, null, 2)}</Text>}
      <Button title="Back" onPress={onBack} />
    </View>
  );
}
