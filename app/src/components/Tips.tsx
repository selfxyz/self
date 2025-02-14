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
