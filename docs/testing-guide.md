# Testing Guide

## Jest Configuration

### Setup Files
The project uses comprehensive Jest configuration with:
- `jest.setup.js` - Contains mocks for all native modules
- `jest.config.cjs` - Configures transform patterns and module mapping
- `tsconfig.test.json` - Test-specific TypeScript configuration

### Module Mapping
```javascript
moduleNameMapper: {
  '^@env$': '<rootDir>/tests/__setup__/@env.js',
  '\\.svg$': '<rootDir>/tests/__setup__/svgMock.js',
  '^@/(.*)$': '<rootDir>/src/$1',
  '^@tests/(.*)$': '<rootDir>/tests/src/$1',
}
```

### Transform Patterns
```javascript
transformIgnorePatterns: [
  'node_modules/(?!(react-native|@react-native|@react-navigation|@react-native-community|@segment/analytics-react-native|@openpassport|react-native-keychain|react-native-check-version|react-native-nfc-manager|react-native-passport-reader|react-native-gesture-handler|uuid|@stablelib|@react-native-google-signin|react-native-cloud-storage|@react-native-clipboard|@react-native-firebase)/)',
]
```

## Mock Patterns

### Native Module Mocks
All React Native native modules are mocked in `jest.setup.js`:

#### Firebase Mocks
```javascript
jest.mock('@react-native-firebase/messaging', () => {
  return () => ({
    hasPermission: jest.fn(() => Promise.resolve(true)),
    requestPermission: jest.fn(() => Promise.resolve(true)),
    getToken: jest.fn(() => Promise.resolve('mock-token')),
    onMessage: jest.fn(() => jest.fn()),
    onNotificationOpenedApp: jest.fn(() => jest.fn()),
    getInitialNotification: jest.fn(() => Promise.resolve(null)),
    setBackgroundMessageHandler: jest.fn(),
    registerDeviceForRemoteMessages: jest.fn(() => Promise.resolve()),
    subscribeToTopic: jest.fn(),
    unsubscribeFromTopic: jest.fn(),
  });
});
```

#### Keychain Mocks
```javascript
jest.mock('react-native-keychain', () => ({
  SECURITY_LEVEL_ANY: 'MOCK_SECURITY_LEVEL_ANY',
  SECURITY_LEVEL_SECURE_SOFTWARE: 'MOCK_SECURITY_LEVEL_SECURE_SOFTWARE',
  SECURITY_LEVEL_SECURE_HARDWARE: 'MOCK_SECURITY_LEVEL_SECURE_HARDWARE',
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
  ACCESSIBLE: {
    WHEN_UNLOCKED: 'AccessibleWhenUnlocked',
    AFTER_FIRST_UNLOCK: 'AccessibleAfterFirstUnlock',
    ALWAYS: 'AccessibleAlways',
    WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'AccessibleWhenPasscodeSetThisDeviceOnly',
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly',
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AccessibleAfterFirstUnlockThisDeviceOnly',
    ALWAYS_THIS_DEVICE_ONLY: 'AccessibleAlwaysThisDeviceOnly',
  },
  ACCESS_CONTROL: {
    USER_PRESENCE: 'UserPresence',
    BIOMETRY_ANY: 'BiometryAny',
    BIOMETRY_CURRENT_SET: 'BiometryCurrentSet',
    DEVICE_PASSCODE: 'DevicePasscode',
    APPLICATION_PASSWORD: 'ApplicationPassword',
    BIOMETRY_ANY_OR_DEVICE_PASSCODE: 'BiometryAnyOrDevicePasscode',
    BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE: 'BiometryCurrentSetOrDevicePasscode',
  },
}));
```

#### NFC Mocks
```javascript
jest.mock('react-native-nfc-manager', () => ({
  start: jest.fn(),
  isSupported: jest.fn().mockResolvedValue(true),
  isEnabled: jest.fn().mockResolvedValue(true),
  registerTagEvent: jest.fn(),
  unregisterTagEvent: jest.fn(),
  requestTechnology: jest.fn(),
  cancelTechnologyRequest: jest.fn(),
  getTag: jest.fn(),
  setAlertMessage: jest.fn(),
  sendMifareCommand: jest.fn(),
  sendCommandAPDU: jest.fn(),
  transceive: jest.fn(),
  getMaxTransceiveLength: jest.fn(),
  setTimeout: jest.fn(),
  connect: jest.fn(),
  close: jest.fn(),
  cleanUpTag: jest.fn(),
  default: {
    // Same methods as above
  },
}));
```

### Database Testing
SQLite operations are mocked for testing:

```javascript
// Mock react-native-sqlite-storage
jest.mock('react-native-sqlite-storage', () => ({
  enablePromise: jest.fn(),
  openDatabase: jest.fn(),
}));

// Test database instance
const mockDb = {
  executeSql: jest.fn(() => Promise.resolve()),
};

mockSQLite.openDatabase.mockResolvedValue(mockDb);
```

## Test Organization

### File Structure
```
tests/
├── __setup__/           # Global test setup and mocks
├── src/                 # Unit tests mirroring source structure
├── integration/         # Integration tests
├── e2e/                # End-to-end tests
└── utils/              # Test utilities and helpers
```

### Test File Naming
- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.integration.test.ts`
- E2E tests: Platform-specific YAML files

## Testing Patterns

### Hook Testing
Use `renderHook` for testing custom hooks:

```typescript
import { renderHook } from '@testing-library/react-native';

describe('useModal', () => {
  it('should return modal functions', () => {
    const { result } = renderHook(() => useModal(mockParams));

    expect(result.current).toHaveProperty('showModal');
    expect(result.current).toHaveProperty('dismissModal');
    expect(result.current).toHaveProperty('visible');
  });
});
```

### Component Testing
Test React Native components with proper mocking:

```typescript
import { render, fireEvent } from '@testing-library/react-native';

describe('Component', () => {
  it('should handle user interactions', () => {
    const mockNavigation = { navigate: jest.fn() };
    const { getByText } = render(<Component navigation={mockNavigation} />);

    fireEvent.press(getByText('Button'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Screen');
  });
});
```

### Error Testing
Test error boundaries and error handling:

```typescript
describe('Error handling', () => {
  beforeEach(() => {
    // Suppress console.error during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should handle errors gracefully', () => {
    // Test error scenarios
  });
});
```

## E2E Testing

### Platform-Specific Flows
- Separate test files for iOS and Android
- Maestro for cross-platform E2E testing
- Platform-specific build commands before E2E tests

### Test Commands
```bash
# iOS E2E
yarn test:e2e:ios

# Android E2E
yarn test:e2e:android
```

### Test Data Management
- Mock passport data for testing
- Test-specific environment variables
- Cleanup between test runs

## Performance Testing

### Bundle Analysis
```bash
# Analyze bundle size
yarn analyze:bundle:ios
yarn analyze:bundle:android

# Tree shaking analysis
yarn analyze:tree-shaking
```

### Memory Testing
- Memory leak detection in tests
- Component lifecycle testing
- Native module cleanup verification

## Coverage Strategy

### Coverage Commands
```bash
# Basic coverage
yarn test:coverage

# CI coverage with multiple formats
yarn test:coverage:ci
```

### Coverage Configuration
- Jest coverage reporting with multiple formats
- CI-specific coverage commands
- Coverage thresholds for critical paths

## Best Practices

### Test Isolation
- Always clean up mocks between tests
- Use `beforeEach` and `afterEach` for setup/cleanup
- Avoid shared state between tests

### Mock Management
- Mock at the right level (module vs function)
- Provide realistic mock return values
- Test error scenarios with mocks

### Async Testing
- Use `async/await` for async operations
- Test both success and failure paths
- Handle promises properly in tests

### Platform Testing
- Test platform-specific code paths
- Mock platform-specific modules
- Test conditional rendering logic
