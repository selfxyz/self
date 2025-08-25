// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';

import type { ButtonProps } from '@/components/buttons/AbstractButton';
import AbstractButton from '@/components/buttons/AbstractButton';
import { slate200, slate300, slate500, white } from '@/utils/colors';
import { normalizeBorderWidth } from '@/utils/styleUtils';

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
