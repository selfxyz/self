// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { createContext, createElement, Fragment } from 'react';
// On web we dont need safe context area since we will be inside another app. (and it doesnt work)

export function SafeAreaProvider({ children }) {
  return createElement(Fragment, null, children);
}

export function useSafeAreaInsets() {
  return { top: 0, bottom: 0, left: 0, right: 0 };
}

export function useSafeAreaFrame() {
  return { x: 0, y: 0, width: 0, height: 0 };
}

export function SafeAreaView(props) {
  return createElement('div', props, props.children);
}

export const initialWindowMetrics = {
  insets: {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  frame: {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  },
};

export const SafeAreaContext = createContext(initialWindowMetrics);

export const SafeAreaInsetsContext = createContext({
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
});
