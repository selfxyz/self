// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { slate200, slate300, slate500, white } from '../../constants/colors';
import type { ButtonProps } from './AbstractButton';
import AbstractButton from './AbstractButton';

export interface SecondaryButtonProps extends ButtonProps {
  textColor?: string;
}

export function SecondaryButton({ children, textColor, ...props }: SecondaryButtonProps) {
  const isDisabled = props.disabled;
  const bgColor = isDisabled ? white : slate200;
  const color = textColor ?? (isDisabled ? slate300 : slate500);

  return (
    <AbstractButton {...props} bgColor={bgColor} color={color}>
      {children}
    </AbstractButton>
  );
}
