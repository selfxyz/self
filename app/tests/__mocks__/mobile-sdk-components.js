// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Minimal JS mock for @selfxyz/mobile-sdk-alpha/components used in tests
const React = require('react');

const getTextFromChildren = ch => {
  if (typeof ch === 'string') return ch;
  if (Array.isArray(ch)) return ch.map(getTextFromChildren).join('');
  if (ch && ch.props && ch.props.children)
    return getTextFromChildren(ch.props.children);
  return '';
};

const Caption = ({ children }) =>
  React.createElement(React.Fragment, null, children);
const Description = ({ children }) =>
  React.createElement(React.Fragment, null, children);
const Title = ({ children }) =>
  React.createElement(React.Fragment, null, children);

const { View } = require('react-native');

const PrimaryButton = ({ children, onPress, disabled, testID }) => {
  const buttonText = getTextFromChildren(children);
  const id =
    testID || `button-${buttonText.toLowerCase().replace(/\s+/g, '-')}`;
  return React.createElement(
    View,
    { onPress, disabled, testID: id, accessibilityRole: 'button' },
    children,
  );
};

const SecondaryButton = ({ children, onPress, disabled, testID }) => {
  const buttonText = getTextFromChildren(children);
  const id =
    testID || `button-${buttonText.toLowerCase().replace(/\s+/g, '-')}`;
  return React.createElement(
    View,
    { onPress, disabled, testID: id, accessibilityRole: 'button' },
    children,
  );
};

module.exports = {
  __esModule: true,
  Caption,
  Description,
  Title,
  PrimaryButton,
  SecondaryButton,
};
