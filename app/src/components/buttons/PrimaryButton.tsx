// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

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
