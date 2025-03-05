import React, { useMemo } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Button, Text, ViewProps } from 'tamagui';

import { dinot } from '../../utils/fonts';
import { pressedStyle } from './pressedStyle';

export interface ButtonProps extends ViewProps {
  readonly children: React.ReactNode;
  readonly animatedComponent?: React.ReactNode;
  readonly onPress?: () => void;
}

interface AbstractButtonProps extends ButtonProps {
  readonly bgColor: string;
  readonly borderColor?: string;
  readonly color: string;
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
  animatedComponent,
  ...props
}: AbstractButtonProps): JSX.Element {
  const hasBorder = Boolean(borderColor);
  const containerStyle = useMemo(
    () => [
      styles.container,
      { backgroundColor: bgColor, borderColor: borderColor ?? undefined },
      hasBorder ? styles.withBorder : {},
      style as ViewStyle,
    ],
    [bgColor, borderColor, hasBorder, style],
  );

  const textStyles = useMemo(() => {
    const textStyle = { color };
    return [styles.text, textStyle];
  }, [color]);
  const pressStyleValue = animatedComponent !== undefined ? {} : pressedStyle;

  return (
    <Button
      unstyled
      {...props}
      style={containerStyle}
      pressStyle={pressStyleValue}
    >
      {animatedComponent}
      <Text style={textStyles}>{children}</Text>
    </Button>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    flexDirection: 'row',
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
    fontFamily: dinot,
    textAlign: 'center',
    fontSize: 18,
  },
});
