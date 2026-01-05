// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { amber50, black, slate300, white } from '../../constants/colors';
import type { ButtonProps } from './AbstractButton';
import AbstractButton from './AbstractButton';

export function PrimaryButton({ children, ...props }: ButtonProps) {
  const isDisabled = props.disabled;
  const bgColor = isDisabled ? white : black;
  const color = isDisabled ? slate300 : amber50;

  return (
    <AbstractButton {...props} bgColor={bgColor} color={color}>
      {children}
    </AbstractButton>
  );
}
