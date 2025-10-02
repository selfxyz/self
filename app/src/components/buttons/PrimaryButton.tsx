// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';

import type { ButtonProps } from '@/components/buttons/AbstractButton';
import AbstractButton from '@/components/buttons/AbstractButton';
import { amber50, black, slate100, slate300, slate400, slate600, white } from '@/utils/colors';
import { normalizeBorderWidth } from '@/utils/styleUtils';

export function PrimaryButton({ children, ...props }: ButtonProps) {
  const { borderWidth, ...restProps } = props;
  const isDisabled = restProps.disabled;
  const bgColor = isDisabled ? slate100 : black;
  const color = isDisabled ? slate600 : amber50;
  const borderColor = isDisabled ? slate400 : undefined;

  const numericBorderWidth = normalizeBorderWidth(borderWidth);

  return (
    <AbstractButton
      {...restProps}
      borderWidth={numericBorderWidth}
      borderColor={borderColor}
      bgColor={bgColor}
      color={color}
    >
      {children}
    </AbstractButton>
  );
}
