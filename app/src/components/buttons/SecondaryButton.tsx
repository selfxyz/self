import {
  slate200,
  slate300,
  slate500,
  white,
} from '@selfxyz/ui/dist/utils/colors';
import React from 'react';

import AbstractButton, { ButtonProps } from './AbstractButton';

export function SecondaryButton({ children, ...props }: ButtonProps) {
  const isDisabled = props.disabled;
  const bgColor = isDisabled ? white : slate200;
  const color = isDisabled ? slate300 : slate500;
  const borderColor = isDisabled ? slate200 : undefined;
  return (
    <AbstractButton
      {...props}
      bgColor={bgColor}
      color={color}
      borderColor={borderColor}
    >
      {children}
    </AbstractButton>
  );
}
