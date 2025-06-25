import React from 'react';

export function SafeAreaProvider({ children }) {
  return React.createElement(React.Fragment, null, children);
}

export function useSafeAreaInsets() {
  return { top: 0, bottom: 0, left: 0, right: 0 };
}

export function useSafeAreaFrame() {
  return { x: 0, y: 0, width: 0, height: 0 };
}

export function SafeAreaView(props) {
  return React.createElement('div', props, props.children);
}

export const SafeAreaContext = React.createContext({
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
});

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

export const SafeAreaInsetsContext = React.createContext(initialWindowMetrics)
