//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import { ChevronLeft, X } from '@tamagui/lucide-icons';
import React, { useMemo } from 'react';
import { StatusBar, StatusBarStyle } from 'react-native';
import {
  Button,
  TextProps,
  View,
  ViewProps,
  XStack,
  XStackProps,
} from 'tamagui';

import { Title } from '../typography/Title';

interface NavBarProps extends XStackProps {
  children: React.ReactNode;
  backgroundColor?: string;
  barStyle?: StatusBarStyle;
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
}

export const LeftAction: React.FC<LeftActionProps> = ({
  component,
  color,
  onPress,
  ...props
}) => {
  let children: React.ReactNode = useMemo(() => {
    switch (component) {
      case 'back':
        return (
          <Button
            hitSlop={100}
            onPress={onPress}
            unstyled
            icon={<ChevronLeft size={30} color={color} />}
          />
        );
      case 'close':
        return (
          <Button
            hitSlop={100}
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
          <Button hitSlop={100} onPress={onPress} unstyled>
            {component}
          </Button>
        );
    }
  }, [component]);

  if (!children) {
    return null;
  }

  return <View {...props}>{children}</View>;
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

const NavBarTitle: React.FC<NavBarTitleProps> = ({ children, ...props }) => {
  if (!children) {
    return null;
  }

  return typeof children === 'string' ? (
    <Title {...props}>{children}</Title>
  ) : (
    children
  );
};

const Container: React.FC<NavBarProps> = ({
  children,
  backgroundColor,
  barStyle,
  ...props
}) => {
  return (
    <>
      <StatusBar backgroundColor={backgroundColor} barStyle={barStyle} />
      <XStack
        backgroundColor={backgroundColor}
        flexGrow={1}
        justifyContent="flex-start"
        alignItems="center"
        {...props}
      >
        {children}
      </XStack>
    </>
  );
};

export const NavBar = {
  Container,
  Title: NavBarTitle,
  LeftAction,
  RightAction,
};
