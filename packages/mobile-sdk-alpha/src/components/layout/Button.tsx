// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';

import type { ViewProps } from './View';
import { View } from './View';

interface ButtonProps extends ViewProps {
  children?: React.ReactNode;
  icon?: React.ReactNode;
  iconAfter?: React.ReactNode;
  disabled?: boolean;
  unstyled?: boolean;
  size?: string;
  scaleSpace?: number;
}

export const Button: React.FC<ButtonProps> = props => {
  const {
    children,
    icon,
    iconAfter,
    disabled = false,
    unstyled = false,
    size,
    scaleSpace = 0.66,
    onPress,
    ...viewProps
  } = props;

  const handlePress = disabled ? undefined : onPress;

  // Base defaults for all buttons
  const baseDefaults: Partial<ViewProps> = {
    flexDirection: 'row',
    alignItems: 'center',
  };

  // Style defaults only for non-unstyled buttons
  const styledDefaults: Partial<ViewProps> = unstyled
    ? baseDefaults
    : {
        ...baseDefaults,
        justifyContent: 'center',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: 'transparent',
        padding: size === '$3' ? 8 : size === '$4' ? 12 : 8,
        borderRadius: 4,
      };

  // Calculate spacing between elements
  const spaceSize = 8 * scaleSpace; // Base 8px scaled

  // Build children array with proper spacing
  const buttonChildren = [];

  if (icon) {
    buttonChildren.push(icon);
  }

  if (children) {
    buttonChildren.push(children);
  }

  if (iconAfter) {
    buttonChildren.push(iconAfter);
  }

  // Add spacing between elements
  const spacedChildren = buttonChildren.reduce((acc: React.ReactNode[], child, index) => {
    if (index > 0) {
      acc.push(<View key={`space-${index}`} style={{ width: spaceSize }} />);
    }
    acc.push(<View key={index}>{child}</View>);
    return acc;
  }, []);

  return (
    <View {...styledDefaults} {...viewProps} onPress={handlePress} aria-disabled={disabled}>
      {spacedChildren}
    </View>
  );
};
