// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React from 'react';

import type { ButtonProps } from '@src/components/buttons/AbstractButton';
import AbstractButton from '@src/components/buttons/AbstractButton';
import { slate200, slate300, slate500, white } from '@src/utils/colors';
import { normalizeBorderWidth } from '@src/utils/styleUtils';

export function SecondaryButton({ children, ...props }: ButtonProps) {
  const { borderWidth, ...restProps } = props;
  const isDisabled = restProps.disabled;
  const bgColor = isDisabled ? white : slate200;
  const color = isDisabled ? slate300 : slate500;
  const borderColor = isDisabled ? slate200 : undefined;

  const numericBorderWidth = normalizeBorderWidth(borderWidth);

  return (
    <AbstractButton
      {...restProps}
      borderWidth={numericBorderWidth}
      bgColor={bgColor}
      color={color}
      borderColor={borderColor}
    >
      {children}
    </AbstractButton>
  );
}
