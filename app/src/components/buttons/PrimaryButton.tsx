import React from 'react';

import { amber50, black, slate300, white } from '../../utils/colors';
import AbstractButton, { ButtonProps } from './AbstractButton';

export function PrimaryButton({ children, ...props }: ButtonProps) {
  const isDisabled = props.disabled;
  const bgColor = isDisabled ? white : black;
  const color = isDisabled ? slate300 : amber50;
  const borderColor = isDisabled ? slate300 : undefined;
  return (
    <AbstractButton
      {...props}
      borderColor={borderColor}
      bgColor={bgColor}
      color={color}
    >
      {children}
    </AbstractButton>
  );
}
