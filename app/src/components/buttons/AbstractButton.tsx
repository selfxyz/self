import React from 'react';
import {
  Text,
  StyleSheet,
  Pressable,
  PressableProps,
  ViewStyle,
} from 'react-native';

export interface ButtonProps extends PressableProps {
  children: React.ReactNode;
}

interface AbstractButtonProps extends ButtonProps {
  bgColor: string;
  borderColor?: string;
  color: string;
}

/*
    Base Button component that can be used to create different types of buttons
    use PrimaryButton and SecondaryButton instead of this component or create a new button component

    @dev If the button isnt filling the space check that its parent is 100% width
*/
export default function AbstractButton({
  children,
  bgColor,
  color,
  borderColor,
  style,
  ...pressable
}: AbstractButtonProps) {
  const hasBorder = borderColor ? true : false;
  return (
    <Pressable
      {...pressable}
      style={[
        styles.container,
        { backgroundColor: bgColor, borderColor: borderColor },
        hasBorder ? styles.withBorder : {},
        style as ViewStyle,
      ]}
    >
      <Text style={[styles.text, { color: color }]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    flexDirection: 'column',
    flexGrow: 0,
    flexShrink: 0,
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    rowGap: 12,
    padding: 20,
    borderRadius: 5,
  },
  withBorder: {
    borderWidth: 4,
    padding: 16, // plus 4 of border = 20
  },
  text: {
    fontFamily: 'DINOT-Medium',
    textAlign: 'center',
    fontSize: 18,
  },
});
