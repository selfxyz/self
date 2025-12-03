// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Text, View } from 'tamagui';

import { Caption } from '@selfxyz/mobile-sdk-alpha/components';
import { slate500 } from '@selfxyz/mobile-sdk-alpha/constants/colors';

export interface TipProps {
  title: string;
  body: string;
  icon?: React.ReactNode;
}

function Tip({ title, body, icon }: TipProps) {
  return (
    <View
      backgroundColor="#F6F8FA"
      borderRadius={12}
      flexDirection="row"
      alignItems="flex-start"
      padding={14}
      gap={12}
      shadowColor="#000"
      shadowOpacity={0.04}
      shadowRadius={4}
      marginBottom={4}
    >
      {icon && (
        <View
          minWidth={28}
          minHeight={28}
          justifyContent="center"
          alignItems="center"
        >
          {icon}
        </View>
      )}
      <View flex={1}>
        <Caption size="large" style={{ color: slate500 }}>
          <Text fontWeight={'bold'}>
            {title}
            {': '}
          </Text>
          {body}
        </Caption>
      </View>
    </View>
  );
}

export default function Tips({ items }: { items: TipProps[] }) {
  return (
    <View paddingVertical={10} gap={12}>
      {items.map((item, index) => (
        <Tip key={index} {...item} />
      ))}
    </View>
  );
}
