// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Minimal JS mock for @selfxyz/mobile-sdk-alpha/components used in tests
// Use ES6 import instead of require() to avoid OOM issues in CI
import React from 'react';

const getTextFromChildren = ch => {
  if (typeof ch === 'string') return ch;
  if (Array.isArray(ch)) return ch.map(getTextFromChildren).join('');
  if (ch && ch.props && ch.props.children)
    return getTextFromChildren(ch.props.children);
  return '';
};

export const Caption = ({ children }) =>
  React.createElement(React.Fragment, null, children);

export const Description = ({ children }) =>
  React.createElement(React.Fragment, null, children);

// Use React.createElement directly instead of requiring react-native to avoid memory issues
export const PrimaryButton = ({ children, onPress, disabled, testID }) => {
  const buttonText = getTextFromChildren(children);
  const id =
    testID || `button-${buttonText.toLowerCase().replace(/\s+/g, '-')}`;
  return React.createElement(
    'View',
    { onPress, disabled, testID: id, accessibilityRole: 'button' },
    children,
  );
};

export const SecondaryButton = ({ children, onPress, disabled, testID }) => {
  const buttonText = getTextFromChildren(children);
  const id =
    testID || `button-${buttonText.toLowerCase().replace(/\s+/g, '-')}`;
  return React.createElement(
    'View',
    { onPress, disabled, testID: id, accessibilityRole: 'button' },
    children,
  );
};

export const Title = ({ children }) =>
  React.createElement(React.Fragment, null, children);
