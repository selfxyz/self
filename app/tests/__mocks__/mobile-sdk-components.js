// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Minimal JS mock for @selfxyz/mobile-sdk-alpha/components used in tests
// CRITICAL: Do NOT import React to avoid OOM issues in CI

const getTextFromChildren = ch => {
  if (typeof ch === 'string') return ch;
  if (Array.isArray(ch)) return ch.map(getTextFromChildren).join('');
  if (ch && ch.props && ch.props.children)
    return getTextFromChildren(ch.props.children);
  return '';
};

// Simple mock components that return plain objects instead of using React.createElement
export const Caption = ({ children }) => ({
  type: 'Caption',
  props: { children },
});

export const Description = ({ children }) => ({
  type: 'Description',
  props: { children },
});

export const PrimaryButton = ({ children, onPress, disabled, testID }) => {
  const buttonText = getTextFromChildren(children);
  const id =
    testID || `button-${buttonText.toLowerCase().replace(/\s+/g, '-')}`;
  return {
    type: 'PrimaryButton',
    props: {
      children,
      onPress,
      disabled,
      testID: id,
      accessibilityRole: 'button',
    },
  };
};

export const SecondaryButton = ({ children, onPress, disabled, testID }) => {
  const buttonText = getTextFromChildren(children);
  const id =
    testID || `button-${buttonText.toLowerCase().replace(/\s+/g, '-')}`;
  return {
    type: 'SecondaryButton',
    props: {
      children,
      onPress,
      disabled,
      testID: id,
      accessibilityRole: 'button',
    },
  };
};

export const Title = ({ children }) => ({
  type: 'Title',
  props: { children },
});
