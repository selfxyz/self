// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// UI-related mocks grouped to keep jest.setup.js concise

// Mock react-native-webview globally to avoid ESM parsing and native behaviors
// Note: Individual test files can override this with their own more specific mocks
jest.mock('react-native-webview', () => {
  // Avoid requiring React to prevent nested require memory issues
  // Return a simple pass-through mock - tests can override with JSX mocks if needed
  const MockWebView = jest.fn(() => null);
  MockWebView.displayName = 'MockWebView';
  return {
    __esModule: true,
    default: MockWebView,
    WebView: MockWebView,
  };
});

// Mock ExpandableBottomLayout to simple containers to avoid SDK internals in tests
jest.mock('@/layouts/ExpandableBottomLayout', () => {
  // Avoid requiring React to prevent nested require memory issues
  // These need to pass through children so WebView is rendered
  const Layout = ({ children, ...props }) => children;
  const TopSection = ({ children, ...props }) => children;
  const BottomSection = ({ children, ...props }) => children;
  const FullSection = ({ children, ...props }) => children;
  return {
    __esModule: true,
    ExpandableBottomLayout: { Layout, TopSection, BottomSection, FullSection },
  };
});

// Mock mobile-sdk-alpha components used by NavBar (Button, XStack)
jest.mock('@selfxyz/mobile-sdk-alpha/components', () => {
  // Avoid requiring React to prevent nested require memory issues
  // Create mock components that work with React testing library
  // Button needs to render a host element with onPress so tests can interact with it
  const Button = jest.fn(({ testID, icon, onPress, children, ...props }) => {
    // Render as a mock-touchable-opacity host element so fireEvent.press works
    // This allows tests to query by testID and press the button
    return (
      <mock-touchable-opacity testID={testID} onPress={onPress} {...props}>
        {icon || children || null}
      </mock-touchable-opacity>
    );
  });
  Button.displayName = 'MockButton';

  const XStack = jest.fn(({ children, ...props }) => children || null);
  XStack.displayName = 'MockXStack';

  const Text = jest.fn(({ children, ...props }) => children || null);
  Text.displayName = 'MockText';

  const Title = jest.fn(({ children, ...props }) => children || null);
  Title.displayName = 'MockTitle';

  const View = jest.fn(({ children, ...props }) => children || null);
  View.displayName = 'MockView';

  return {
    __esModule: true,
    Button,
    XStack,
    Title,
    View,
    // Provide minimal Text to satisfy potential usages
    Text,
  };
});

// Mock Tamagui to avoid hermes-parser WASM memory issues during transformation
jest.mock('tamagui', () => {
  // Avoid requiring React to prevent nested require memory issues
  // Create mock components that work with React testing library

  // Helper to create a simple pass-through mock component
  const createMockComponent = displayName => {
    const Component = jest.fn(props => props.children || null);
    Component.displayName = displayName;
    return Component;
  };

  // Mock styled function - simplified version that returns the component
  const styled = jest.fn(Component => Component);

  // Create all Tamagui component mocks
  const Button = createMockComponent('MockButton');
  const XStack = createMockComponent('MockXStack');
  const YStack = createMockComponent('MockYStack');
  const ZStack = createMockComponent('MockZStack');
  const Text = createMockComponent('MockText');
  const View = createMockComponent('MockView');
  const ScrollView = createMockComponent('MockScrollView');
  const Spinner = createMockComponent('MockSpinner');
  const Image = createMockComponent('MockImage');
  const Card = createMockComponent('MockCard');
  const Separator = createMockComponent('MockSeparator');
  const TextArea = createMockComponent('MockTextArea');
  const Input = createMockComponent('MockInput');
  const Anchor = createMockComponent('MockAnchor');

  // Mock Select component with nested components
  const Select = Object.assign(createMockComponent('MockSelect'), {
    Trigger: createMockComponent('MockSelectTrigger'),
    Value: createMockComponent('MockSelectValue'),
    Content: createMockComponent('MockSelectContent'),
    Item: createMockComponent('MockSelectItem'),
    Group: createMockComponent('MockSelectGroup'),
    Label: createMockComponent('MockSelectLabel'),
    Viewport: createMockComponent('MockSelectViewport'),
    ScrollUpButton: createMockComponent('MockSelectScrollUpButton'),
    ScrollDownButton: createMockComponent('MockSelectScrollDownButton'),
  });

  // Mock Sheet component with nested components
  const Sheet = Object.assign(createMockComponent('MockSheet'), {
    Frame: createMockComponent('MockSheetFrame'),
    Overlay: createMockComponent('MockSheetOverlay'),
    Handle: createMockComponent('MockSheetHandle'),
    ScrollView: createMockComponent('MockSheetScrollView'),
  });

  // Mock Adapt component
  const Adapt = createMockComponent('MockAdapt');

  // Mock TamaguiProvider - simple pass-through that renders children
  const TamaguiProvider = jest.fn(({ children }) => children || null);
  TamaguiProvider.displayName = 'MockTamaguiProvider';

  // Mock configuration factory functions
  const createFont = jest.fn(() => ({}));
  const createTamagui = jest.fn(() => ({}));

  return {
    __esModule: true,
    styled,
    Button,
    XStack,
    YStack,
    ZStack,
    Text,
    View,
    ScrollView,
    Spinner,
    Image,
    Card,
    Separator,
    TextArea,
    Input,
    Anchor,
    Select,
    Sheet,
    Adapt,
    TamaguiProvider,
    createFont,
    createTamagui,
    // Provide default exports for other common components
    default: jest.fn(() => null),
  };
});

// Mock Tamagui lucide icons to simple components to avoid theme context
jest.mock('@tamagui/lucide-icons', () => {
  // Avoid requiring React to prevent nested require memory issues
  // Return mock components that can be queried by testID
  const makeIcon = name => {
    // Use a mock element tag that React can render
    const Icon = props => ({
      $$typeof: Symbol.for('react.element'),
      type: `mock-icon-${name}`,
      props: { testID: `icon-${name}`, ...props },
      key: null,
      ref: null,
    });
    Icon.displayName = `MockIcon(${name})`;
    return Icon;
  };
  return {
    __esModule: true,
    ExternalLink: makeIcon('external-link'),
    X: makeIcon('x'),
    Clipboard: makeIcon('clipboard'),
    Check: makeIcon('check'),
    Circle: makeIcon('circle'),
    ChevronDown: makeIcon('chevron-down'),
    ChevronLeft: makeIcon('chevron-left'),
  };
});

// Mock WebViewFooter to avoid SDK rendering complexity
jest.mock('@/components/WebViewFooter', () => {
  // Avoid requiring React to prevent nested require memory issues
  const WebViewFooter = jest.fn(() => null);
  return { __esModule: true, WebViewFooter };
});

// Mock screens that use mobile-sdk-alpha flows with PixelRatio issues or missing dependencies
jest.mock('@/screens/documents/selection/ConfirmBelongingScreen', () => {
  const MockScreen = jest.fn(() => null);
  MockScreen.displayName = 'MockConfirmBelongingScreen';
  return { __esModule: true, default: MockScreen };
});

jest.mock('@/screens/documents/selection/CountryPickerScreen', () => {
  const MockScreen = jest.fn(() => null);
  MockScreen.displayName = 'MockCountryPickerScreen';
  return { __esModule: true, default: MockScreen };
});
