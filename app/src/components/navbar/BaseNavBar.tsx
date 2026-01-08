// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useMemo } from 'react';
import type { TextProps } from 'react-native';
import type { SystemBarStyle } from 'react-native-edge-to-edge';
import { SystemBars } from 'react-native-edge-to-edge';
import { ChevronLeft, X } from '@tamagui/lucide-icons';

import type { ViewProps } from '@selfxyz/mobile-sdk-alpha/components';
import {
  Button,
  Title,
  View,
  XStack,
} from '@selfxyz/mobile-sdk-alpha/components';

interface NavBarProps extends ViewProps {
  children: React.ReactNode;
  backgroundColor?: string;
  barStyle?: SystemBarStyle;
}
interface LeftActionProps extends ViewProps {
  component?: 'back' | 'close' | React.ReactNode;
  onPress?: () => void;
  color?: string;
}
interface RightActionProps extends ViewProps {
  component?: React.ReactNode;
  onPress?: () => void;
}
interface NavBarTitleProps extends TextProps {
  children?: React.ReactNode;
  size?: 'large' | undefined;
  color?: string;
}

export const LeftAction: React.FC<LeftActionProps> = ({
  component,
  color,
  onPress,
  ...props
}) => {
  const children: React.ReactNode = useMemo(() => {
    switch (component) {
      case 'back':
        return (
          <Button
            hitSlop={{ top: 20, bottom: 10, left: 20, right: 10 }}
            onPress={onPress}
            unstyled
            icon={<ChevronLeft size={30} color={color} />}
          />
        );
      case 'close':
        return (
          <Button
            hitSlop={{ top: 20, bottom: 10, left: 20, right: 10 }}
            onPress={onPress}
            unstyled
            icon={<X size={30} color={color} />}
          />
        );
      case undefined:
      case null:
        return null;
      default:
        return (
          <Button
            hitSlop={{ top: 20, bottom: 10, left: 20, right: 10 }}
            onPress={onPress}
            unstyled
          >
            {component}
          </Button>
        );
    }
  }, [color, component, onPress]);

  if (!children) {
    return null;
  }

  return <View {...props}>{children}</View>;
};

const NavBarTitle: React.FC<NavBarTitleProps> = ({
  children,
  color,
  style,
  ...props
}) => {
  if (!children) {
    return null;
  }

  return typeof children === 'string' ? (
    <Title style={[color ? { color } : undefined, style]} {...props}>
      {children}
    </Title>
  ) : (
    children
  );
};

const Container: React.FC<NavBarProps> = ({
  children,
  backgroundColor,
  barStyle,
  justifyContent = 'flex-start',
  alignItems = 'center',
  flexShrink = 0,
  flexDirection = 'row',
  ...props
}) => {
  return (
    <>
      <SystemBars style={barStyle} />
      <XStack
        backgroundColor={backgroundColor}
        justifyContent={justifyContent}
        alignItems={alignItems}
        flexShrink={flexShrink}
        flexDirection={flexDirection}
        {...props}
      >
        {children}
      </XStack>
    </>
  );
};

export const RightAction: React.FC<RightActionProps> = ({
  component,
  onPress,
  ...props
}) => {
  if (!component) {
    return null;
  }

  return (
    <View onPress={onPress} {...props}>
      {component}
    </View>
  );
};

export const NavBar = {
  Container,
  Title: NavBarTitle,
  LeftAction,
  RightAction,
};
