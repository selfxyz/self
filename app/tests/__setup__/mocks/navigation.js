// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Grouped navigation mocks to avoid cluttering jest.setup.js
jest.mock('@react-navigation/native', () => {
  // Avoid nested requireActual to prevent OOM in CI
  // Create mock navigator without requiring React
  const MockNavigator = (props, _ref) => props.children;
  MockNavigator.displayName = 'MockNavigator';

  // `useFocusEffect` should behave like an effect: it should not synchronously run
  // on every re-render, otherwise any state updates inside the callback can cause
  // an infinite render loop in tests.
  const focusEffectCallbacks = new WeakSet();

  return {
    useFocusEffect: jest.fn(callback => {
      // Invoke only once per callback instance (per component mount), similar to
      // how a real focus effect would run on focus rather than every render.
      if (
        typeof callback === 'function' &&
        !focusEffectCallbacks.has(callback)
      ) {
        focusEffectCallbacks.add(callback);
        return callback();
      }
      return undefined;
    }),
    useNavigation: jest.fn(() => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => true),
      dispatch: jest.fn(),
      getState: jest.fn(() => ({ routes: [{ name: 'Home' }], index: 0 })),
    })),
    useRoute: jest.fn(() => ({
      key: 'mock-route-key',
      name: 'MockRoute',
      params: {},
    })),
    useIsFocused: jest.fn(() => true),
    useLinkTo: jest.fn(() => jest.fn()),
    createNavigationContainerRef: jest.fn(() => global.mockNavigationRef),
    createStaticNavigation: jest.fn(() => MockNavigator),
    NavigationContainer: ({ children }) => children,
    DefaultTheme: {},
    DarkTheme: {},
  };
});

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: jest.fn(config => config),
  createNavigatorFactory: jest.fn(),
}));

// Mock core navigation to avoid requiring a NavigationContainer for hooks
jest.mock('@react-navigation/core', () => {
  // Avoid nested requireActual to prevent OOM in CI
  return {
    useNavigation: jest.fn(() => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => true),
      dispatch: jest.fn(),
      getState: jest.fn(() => ({ routes: [{ name: 'Home' }], index: 0 })),
    })),
    useRoute: jest.fn(() => ({
      key: 'mock-route-key',
      name: 'MockRoute',
      params: {},
    })),
    useIsFocused: jest.fn(() => true),
    useLinkTo: jest.fn(() => jest.fn()),
    NavigationContext: {
      Provider: ({ children }) => children,
      Consumer: ({ children }) => children(null),
    },
    NavigationRouteContext: {
      Provider: ({ children }) => children,
      Consumer: ({ children }) => children(null),
    },
  };
});
