// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { slate200, slate300, slate500, white } from '../../constants/colors';
import { normalizeBorderWidth } from '../../utils/styleUtils';
import type { ButtonProps, ExtractedButtonStyleProps } from './AbstractButton';
import AbstractButton from './AbstractButton';

export interface SecondaryButtonProps extends ButtonProps {
  textColor?: string;
}

/**
 * Extract standard style props for secondary button.
 * Separates border and font props from other button props.
 */
function extractSecondaryButtonStyleProps(props: Omit<SecondaryButtonProps, 'children'>): {
  styleProps: ExtractedButtonStyleProps;
  restProps: Omit<SecondaryButtonProps, 'children' | keyof ExtractedButtonStyleProps>;
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

export function SecondaryButton({ children, textColor, ...props }: SecondaryButtonProps) {
  const { styleProps, restProps } = extractSecondaryButtonStyleProps(props);
  const isDisabled = restProps.disabled;
  const bgColor = isDisabled ? white : slate200;
  const color = textColor ?? (isDisabled ? slate300 : slate500);
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
