import { ChevronLeft, X } from '@tamagui/lucide-icons';
import React, { useMemo } from 'react';
import { StatusBar, StatusBarStyle, StyleSheet } from 'react-native';
import {
  Button,
  TextProps,
  View,
  ViewProps,
  XStack,
  XStackProps,
} from 'tamagui';

import { Title } from './typography/Title';

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
  const chevronLeft = useMemo(() => {
    return <ChevronLeft size={30} color={color} />;
  }, [color]);
  const closeButton = useMemo(() => {
    return <X size={30} color={color} />;
  }, [color]);

  const children: React.ReactNode = useMemo(() => {
    switch (component) {
      case 'back':
        return (
          <Button hitSlop={100} onPress={onPress} unstyled icon={chevronLeft} />
        );
      case 'close':
        return (
          <Button hitSlop={100} onPress={onPress} unstyled icon={closeButton} />
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
  }, [chevronLeft, closeButton, component, onPress]);

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
    return <></>;
  }

  return typeof children === 'string' ? (
    <Title {...props}>{children}</Title>
  ) : (
    <>children</>
  );
};

const Container: React.FC<NavBarProps> = ({
  children,
  backgroundColor,
  barStyle,
  ...props
}) => {
  const containerStyle = useMemo(() => {
    return [styles.container, backgroundColor ? { backgroundColor } : null];
  }, [backgroundColor]);

  return (
    <>
      <StatusBar backgroundColor={backgroundColor} barStyle={barStyle} />
      <XStack style={containerStyle} {...props}>
        {children}
      </XStack>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
});

export const NavBar = {
  Container,
  Title: NavBarTitle,
  LeftAction,
  RightAction,
};
