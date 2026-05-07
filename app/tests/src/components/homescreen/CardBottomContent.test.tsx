// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { render } from '@testing-library/react-native';

import CardBottomContent from '@/components/homescreen/CardBottomContent';

jest.mock('tamagui', () => {
  const MockYStack = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  const MockXStack = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  const MockText = ({ children, ...props }: any) => <span {...props}>{children}</span>;

  return {
    __esModule: true,
    Text: MockText,
    XStack: MockXStack,
    YStack: MockYStack,
  };
});

describe('CardBottomContent', () => {
  const fontSize = {
    bottomId: 12,
    bottomLabel: 10,
    badge: 10,
  };

  it('renders descriptive verification badges', () => {
    const { root } = render(
      <CardBottomContent
        truncatedId="0x12..abc"
        bottomLabel="INDIAN PASSPORT"
        badges={[
          {
            text: 'NFC verified',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            textColor: '#fff',
          },
        ]}
        padding={16}
        fontSize={fontSize as any}
      />,
    );

    const badgeText = root.findAll(
      node => node.type === 'span' && node.props.children === 'NFC verified',
    );

    expect(badgeText).toHaveLength(1);
  });

  it('renders multiple badges without collapsing the copy to generic status', () => {
    const { root } = render(
      <CardBottomContent
        truncatedId="0x12..abc"
        bottomLabel="INDIAN PASSPORT"
        badges={[
          {
            text: 'INACTIVE',
            backgroundColor: '#f00',
            textColor: '#fff',
          },
          {
            text: 'MRZ verified',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            textColor: '#fff',
          },
        ]}
        padding={16}
        fontSize={fontSize as any}
      />,
    );

    const mrzBadgeText = root.findAll(
      node => node.type === 'span' && node.props.children === 'MRZ verified',
    );

    expect(mrzBadgeText).toHaveLength(1);
  });
});
