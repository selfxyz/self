//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import React from 'react';
import { Text, View } from 'tamagui';

import { slate500 } from '../utils/colors';
import { Caption } from './typography/Caption';

export interface TipProps {
  title: string;
  body: string;
}

function Tip({ title, body }: TipProps) {
  return (
    <View>
      <Caption size="large" color={slate500}>
        <Text fontWeight={'bold'}>
          {title}
          {': '}
        </Text>
        {body}
      </Caption>
    </View>
  );
}

export default function Tips({ items }: { items: TipProps[] }) {
  return (
    <View paddingVertical={20} gap={10}>
      {items.map((item, index) => (
        <Tip key={index} title={item.title} body={item.body} />
      ))}
    </View>
  );
}
