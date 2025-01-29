import React, { useMemo } from 'react';
import {
  Button,
  H1,
  TextProps,
  View,
  ViewProps,
  XStack,
  XStackProps,
} from 'tamagui';
import { ChevronLeft, X } from '@tamagui/lucide-icons';

interface NavBarProps extends XStackProps {
  children: React.ReactNode;
}
interface LeftActionProps extends ViewProps {
  component?: 'back' | 'close' | React.ReactNode;
  onPress?: () => void;
}
interface RightActionProps extends ViewProps {
  component?: React.ReactNode;
  onPress?: () => void;
}
interface TitleProps extends TextProps {
  children?: React.ReactNode;
}

export const LeftAction: React.FC<LeftActionProps> = ({
  component,
  onPress,
  ...props
}) => {
  let children: React.ReactNode = useMemo(() => {
    switch (component) {
      case 'back':
        return <Button unstyled icon={<ChevronLeft size="$4" />} />;
      case 'close':
        return <Button unstyled icon={<X size="$4" />} />;
      case undefined:
      case null:
        return null;
      default:
        return <Button unstyled>{component}</Button>;
    }
  }, [component]);

  if (!children) {
    return null;
  }

  return (
    <View onPress={onPress} {...props}>
      {children}
    </View>
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

const Title: React.FC<TitleProps> = ({ children, ...props }) => {
  if (!children) {
    return null;
  }

  return typeof children === 'string' ? (
    <H1 {...props}>{children}</H1>
  ) : (
    children
  );
};

const Container: React.FC<NavBarProps> = ({ children, ...props }) => {
  return (
    <XStack flexGrow={1} justifyContent="space-between" {...props}>
      {children}
    </XStack>
  );
};

export const NavBar = {
  Container,
  Title,
  LeftAction,
  RightAction,
};
