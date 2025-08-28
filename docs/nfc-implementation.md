# NFC Implementation Guide

## Architecture Overview

### Cross-Platform Implementation
The NFC passport reading system uses platform-specific native modules with a unified JavaScript interface:

- **iOS**: Custom PassportReader Swift module
- **Android**: Custom RNPassportReaderModule Kotlin implementation
- **JavaScript**: Unified interface with platform detection

### Data Flow
1. User initiates scan with passport details (MRZ data)
2. Platform-specific native module handles NFC communication
3. Raw passport data returned to JavaScript
4. Data parsed and normalized for processing
5. Zero-knowledge proof generation and verification

## iOS Implementation

### PassportReader Module
The iOS implementation uses a custom Swift module with NFC capabilities:

```swift
func readPassport(
  password: String,
  type: PACEPasswordType,
  tags: [NFCISO7816Tag],
  skipCA: Bool,
  skipPACE: Bool,
  useExtendedMode: Bool,
  usePacePolling: Bool,
  customDisplayMessage: ((NFCViewDisplayMessage) -> String?)?
) async throws -> Passport
```

### Authentication Methods
- **MRZ Key**: Derived from passport number, date of birth, and expiry date
- **CAN (Card Access Number)**: 6-digit number for PACE authentication
- **PACE**: Password Authenticated Connection Establishment

### Error Handling
- Comprehensive try-catch blocks for each authentication step
- Graceful fallback from PACE to BAC when needed
- User-friendly error messages for different failure scenarios

## Android Implementation

### RNPassportReaderModule
The Android implementation uses a custom Kotlin module:

```kotlin
@ReactMethod
fun scan(opts: ReadableMap, promise: Promise) {
  // NFC adapter setup and validation
  // Intent handling for tag discovery
  // Async task execution for passport reading
}
```

### Authentication Flow
1. **PACE Authentication**: Primary method using CAN or MRZ key
2. **BAC Fallback**: Basic Access Control when PACE fails
3. **Retry Logic**: Multiple attempts with delays between retries

### Intent Handling
- `onNewIntent` in MainActivity routes to RNPassportReaderModule
- Foreground dispatch for NFC tag discovery
- Proper lifecycle management (resume/pause)

### Android-Specific Workarounds
On certain Android devices, NFC scanner fails to activate on app launch. The automatic workaround uses an event-driven approach:
- `scan()` method sets `shouldEnableNfcOnResume=true`
- Programmatically backgrounds the app using `moveTaskToBack(true)`
- Waits 500ms, then foregrounds it
- NFC enablement happens in `onHostResume()` when activity is properly in foreground

## JavaScript Interface

### Unified Scan Function
```typescript
export const scan = async (inputs: Inputs) => {
  return Platform.OS === 'android'
    ? await scanAndroid(inputs)
    : await scanIOS(inputs);
};
```

### Input Parameters
```typescript
interface Inputs {
  passportNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  canNumber?: string;
  useCan?: boolean;
  skipPACE?: boolean;
  skipCA?: boolean;
  extendedMode?: boolean;
  usePacePolling?: boolean;
}
```

### Response Processing
- Platform-specific response parsing
- Data normalization for consistent format
- Error handling and validation

## Authentication Methods

### MRZ Key Generation
The MRZ key is derived from passport data:
```typescript
const mrzKey = getMRZKey(
  passportNumber: string,
  dateOfBirth: string,
  dateOfExpiry: string
);
```

### PACE Authentication
- **Primary Method**: Uses CAN or MRZ key for authentication
- **Extended Mode**: Enhanced security features
- **Polling**: Optional polling mechanism for better reliability

### BAC (Basic Access Control)
- **Fallback Method**: Used when PACE fails
- **Multiple Attempts**: Up to 3 attempts with delays
- **Error Recovery**: Graceful handling of authentication failures

## Error Handling Patterns

### Authentication Failures
- **Access Denied**: Invalid credentials or expired passport
- **BAC Denied**: Basic Access Control failure
- **PACE Exception**: Password Authenticated Connection Establishment failure
- **Card Exception**: General NFC communication issues

### Retry Mechanisms
- Multiple BAC attempts with delays between retries
- Graceful degradation from PACE to BAC
- Timeout handling for slow operations
- User feedback during retry attempts

### User Feedback
- Real-time status updates during scanning
- Haptic feedback for different states
- Clear error messages for troubleshooting
- Progress indicators for long operations

## Performance Optimizations

### Timeout Management
- Configurable timeouts for different operations
- Platform-specific timeout values
- Graceful timeout handling with user feedback

### Memory Management
- Proper cleanup of NFC connections
- Resource disposal in finally blocks
- Memory leak prevention
- Component lifecycle management

### Debug Logging
- Conditional debug logging based on environment
- Performance timing for scan operations
- Detailed error logging for troubleshooting
- Analytics integration for performance monitoring

## Security Considerations

### Data Protection
- Sensitive data not logged in production
- Secure storage of authentication keys
- Proper cleanup of sensitive data
- Memory protection for cryptographic operations

### Certificate Validation
- Document Signer Certificate (DSC) validation
- Certificate chain verification
- Trust store management
- Certificate revocation checking

### Privacy Features
- Zero-knowledge proof generation
- Selective attribute revelation
- Privacy-preserving age verification
- Identity commitment privacy

## Testing Strategy

### Mock Implementations
- Comprehensive mocks for testing without hardware
- Platform-specific mock data
- Error scenario testing
- Performance testing with simulated delays

### Integration Testing
- Real device testing for critical paths
- Platform-specific test scenarios
- Performance benchmarking
- Security testing with realistic, synthetic passport data (NEVER real user data)

### Test Data
- Mock passport data for unit tests
- Test certificates for validation
- Error scenarios for edge case testing
- Performance benchmarks for optimization

## Platform-Specific Considerations

### iOS
- NFC capabilities require iOS 13+
- Background NFC reading limitations
- Privacy permissions and user consent
- App Store review requirements

### Android
- NFC hardware requirements
- Permission handling
- Background processing limitations
- Device-specific workarounds

### Web
- No NFC support (fallback to other methods)
- Alternative authentication flows
- Cross-platform compatibility

## Common Issues and Solutions

### NFC Not Detected
- Check device NFC capabilities
- Verify NFC is enabled in settings
- Ensure app has proper permissions
- Try device-specific workarounds

### Authentication Failures
- Verify passport data accuracy
- Check passport expiration
- Try alternative authentication methods
- Implement retry logic with delays

### Performance Issues
- Optimize timeout values
- Implement proper cleanup
- Monitor memory usage
- Profile NFC operations

## Best Practices

### Error Handling
- Always implement comprehensive error handling
- Provide user-friendly error messages
- Log errors for debugging
- Implement graceful degradation

### Performance
- Optimize timeout values for your use case
- Implement proper resource cleanup
- Monitor memory usage
- Profile NFC operations

### Security
- Never log sensitive data
- Implement proper certificate validation
- Use secure storage for keys
- Follow platform security guidelines

### User Experience
- Provide clear feedback during operations
- Implement haptic feedback
- Show progress indicators
- Handle edge cases gracefully
