// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { amber50, black, slate300, white } from '../../constants/colors';
import { normalizeBorderWidth } from '../../utils/styleUtils';
import type { ButtonProps, ExtractedButtonStyleProps } from './AbstractButton';
import AbstractButton from './AbstractButton';

/**
 * Extract standard style props for primary button.
 * Separates border and font props from other button props.
 */
function extractPrimaryButtonStyleProps(props: Omit<ButtonProps, 'children'>): {
  styleProps: ExtractedButtonStyleProps;
  restProps: Omit<ButtonProps, 'children' | keyof ExtractedButtonStyleProps>;
} {
  const { borderWidth, borderColor, fontSize, ...restProps } = props;
  return {
    styleProps: {
      borderWidth: normalizeBorderWidth(borderWidth),
      borderColor,
      fontSize,
    },
    restProps,
  };
}

export function PrimaryButton({ children, ...props }: ButtonProps) {
  const { styleProps, restProps } = extractPrimaryButtonStyleProps(props);
  const isDisabled = restProps.disabled;
  const bgColor = isDisabled ? white : black;
  const color = isDisabled ? slate300 : amber50;
  const borderColor = isDisabled ? slate300 : styleProps.borderColor;

  return (
    <AbstractButton
      {...restProps}
      borderWidth={styleProps.borderWidth}
      borderColor={borderColor}
      fontSize={styleProps.fontSize}
      bgColor={bgColor}
      color={color}
    >
      {children}
    </AbstractButton>
  );
}
