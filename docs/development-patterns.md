# Self App Development Patterns

## Docstring coverage workflow

- Run `yarn docstrings` to check documentation coverage for both the mobile app and SDK. This generates `docs/coverage/app.json` and `docs/coverage/sdk.json` so you can diff coverage changes in version control.
- Run `yarn docstrings:app` to check only the mobile app exports.
- Run `yarn docstrings:sdk` to focus on `@selfxyz/mobile-sdk-alpha` only.
- Add `--details` to any command when you want a full per-file JSON breakdown for ad-hoc analysis—the default snapshots include only top-level totals and a small sample of undocumented exports to keep the tracked files compact.

Run the docstring reports locally before committing to track coverage changes. The reports are advisory—use them to identify documentation gaps but they won't block builds.

## React Native Architecture

### Navigation System
The app uses `@react-navigation/native` with `createStaticNavigation` for type-safe navigation. Screens are organized by feature modules and use platform-specific initial routes.

```typescript
// Navigation setup pattern
export const navigationScreens = {
  ...systemScreens,
  ...passportScreens,
  ...homeScreens,
  ...proveScreens,
  ...settingsScreens,
  ...recoveryScreens,
  ...devScreens,
};

// Platform-specific initial routes
initialRouteName: Platform.OS === 'web' ? 'Home' : 'Splash'
```

### Modal System
Custom modal system using `useModal` hook with callback registry for handling button presses and dismissals.

```typescript
const { showModal, dismissModal, visible } = useModal({
  titleText: 'Modal Title',
  bodyText: 'Modal content',
  buttonText: 'Action',
  onButtonPress: async () => {
    // Handle button press
  },
  onModalDismiss: () => {
    // Handle modal dismiss
  },
});
```

### Platform-Specific Handling
Always check platform before implementing platform-specific code:

```typescript
if (Platform.OS === 'ios') {
  // iOS-specific implementation
} else {
  // Android-specific implementation
}
```

### Native Module Initialization
Critical for NFC and other native functionality:

```typescript
// Initialize native modules before any native operations
const modulesReady = await initializeNativeModules();
if (!modulesReady) {
  console.warn('Native modules not ready, proceeding with limited functionality');
}
```

## State Management

### Hook-Based State
- Custom hooks for complex state management (`useModal`, `useHapticNavigation`)
- Zustand for global state management
- React Navigation state for screen-specific data

### Data Persistence
- **AsyncStorage**: Simple key-value storage
- **SQLite**: Complex data (proof history)
- **Keychain**: Sensitive data (biometrics, encryption keys)

## Testing Conventions

### Jest Configuration
- Comprehensive mocks in `jest.setup.js` for all native modules
- Module mapping for clean imports
- Test-specific TypeScript configuration

### Mock Patterns
All React Native native modules are mocked with realistic return values:

```javascript
jest.mock('react-native-keychain', () => ({
  SECURITY_LEVEL_ANY: 'MOCK_SECURITY_LEVEL_ANY',
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
  ACCESSIBLE: {
    WHEN_UNLOCKED: 'AccessibleWhenUnlocked',
    // ... other constants
  },
}));
```

### Testing Patterns
- Use `renderHook` for custom hook testing
- Mock console.error to avoid test output clutter
- Test error boundaries and recovery mechanisms
- E2E testing with Maestro for platform-specific flows

## NFC Implementation

### Cross-Platform Architecture
- **iOS**: Custom PassportReader Swift module
- **Android**: Custom RNPassportReaderModule Kotlin implementation
- Unified JavaScript interface with platform detection

### Authentication Methods
- **MRZ Key**: Derived from passport number, DOB, and expiry date
- **CAN (Card Access Number)**: 6-digit number for PACE authentication
- **PACE**: Password Authenticated Connection Establishment
- **BAC Fallback**: Basic Access Control when PACE fails

### Error Handling
- Multiple BAC attempts with delays
- Graceful degradation from PACE to BAC
- Real-time status updates and haptic feedback
- Comprehensive error boundaries

### JavaScript Interface
```typescript
export const scan = async (inputs: Inputs) => {
  return Platform.OS === 'android'
    ? await scanAndroid(inputs)
    : await scanIOS(inputs);
};
```

## Code Organization

### File Structure
```
src/
├── components/          # Reusable UI components
├── screens/            # Screen components by feature
├── navigation/         # Navigation configuration
├── hooks/              # Custom React hooks
├── utils/              # Shared utilities
├── types/              # TypeScript type definitions
├── stores/             # State management
└── providers/          # Context providers
```

### Import Patterns
- Use `@/` alias for src imports: `import { Component } from '@/components'`
- Use `@tests/` alias for test imports: `import { mockData } from '@tests/utils'`
- Platform-specific imports with conditional rendering

## Build & Deployment

### Scripts
- `yarn ios` / `yarn android` for platform-specific builds
- `yarn test` for Jest testing
- `yarn test:e2e:ios` / `yarn test:e2e:android` for E2E
- Fastlane for deployment automation

### Dependencies
- Yarn workspaces for monorepo management
- Platform-specific native modules
- Tamagui for UI components
- React Navigation for routing

## Security & Privacy

### Data Protection
- Sensitive data not logged in production
- Secure storage with Keychain
- Proper cleanup of sensitive data
- Certificate validation for passport data

### Privacy Features
- Zero-knowledge proof generation
- Selective attribute revelation
- Privacy-preserving age verification
- Identity commitment privacy

## Common Patterns

### Error Handling
```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  // Graceful degradation
  return fallbackValue;
}
```

### Performance Optimization
- Lazy load screens and components
- Bundle size optimization with tree shaking
- Memory leak prevention in native modules
- Proper cleanup in useEffect and component unmount

### Platform Differences
- Always check Platform.OS before platform-specific code
- Different implementations for iOS/Android when needed
- Platform-specific testing strategies
- Conditional rendering for platform differences
