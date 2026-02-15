# Cross-Platform Implementation Plan (iOS)

## Status: Implemented

See `iOS_INTEGRATION_GUIDE.md` for Xcode setup instructions.

## What's Already Shared

**commonMain (works on both platforms):**
- `VerificationViewModel` - All business logic
- `VerificationFlowState` - State machine
- `PassportData` - Data model
- `MrzDetectionState`, `NfcScanState` enums
- `MrzConfirmationScreen`, `MrzViewfinder`, `NfcProgressIndicator` UI components

## What Needs iOS Implementation

1. **MrzScanScreen**
   - Android: Compose UI with camera preview + detection feedback
   - iOS: SwiftUI + UIViewRepresentable for camera + Vision framework
   - Both call same `ViewModel.showMrzConfirmation()` or `ViewModel.updateFromMrz()`
   - Share: Detection state enum, business logic

2. **MrzConfirmationScreen** (if kept in flow)
   - Android: Compose UI with parsed data display
   - iOS: SwiftUI List/Form
   - Both call same `ViewModel.confirmMrzData()`

3. **NfcScanScreen**
   - Android: Compose UI with NFC handling
   - iOS: SwiftUI + CoreNFC
   - Both call same `ViewModel.setNfcResult()`
   - Both use same passport data validation

### Phase 2: iOS-Specific Components

**Camera Preview:**
- Use AVCaptureSession (iOS equivalent of Android PreviewView)
- Wire to SDK's CameraMrzBridgeHandler.scanMrzWithPreview
- Support same onProgress callback for detection states

**MRZ Viewfinder:**
- SwiftUI overlay using Canvas or Shape (similar to Android Canvas)
- Same dimensions: 85% width × 25% height
- Same color transitions: Red → Orange → Yellow → Green
- Same pulsing animation when detected

**Detection Feedback:**
- Use same `MrzDetectionState` enum from SDK
- Same color scheme and messages
- Haptic feedback using UIFeedbackGenerator

### Phase 3: Platform Integration

**ViewModel Integration:**
- Verify StateFlow → Combine/AsyncStream bridge works
- Test ViewModel method calls from Swift
- Handle lifecycle correctly (onAppear/onDisappear)

**Navigation:**
- Android: NavController
- iOS: NavigationStack or custom coordinator
- Keep navigation logic in ViewModel where possible

## Architecture

```
┌─────────────────────────────────────────┐
│           commonMain (Shared)            │
│  ViewModel, State, Models, Business Logic│
│  MrzDetectionState, PassportData         │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼─────┐   ┌──────▼─────┐
│ androidMain│   │  iosMain   │
│            │   │            │
│ Compose UI │   │ SwiftUI    │
│ ML Kit     │   │ Vision     │
│ Android NFC│   │ CoreNFC    │
└────────────┘   └────────────┘
```

## Key Success Factors

1. Business logic already shared (ViewModel)
2. State management is platform-agnostic
3. Data models are shared
4. Detection progress API is platform-agnostic

## Integration

The iOS implementation includes:
- Swift helpers for camera (`MrzCameraHelper.swift`) and NFC (`NfcPassportHelper.swift`)
- iOS-specific screens in `iosMain` that integrate with Swift helpers via UIKitView
- Data persistence using NSUserDefaults
- Camera and NFC permission handling

See `iOS_INTEGRATION_GUIDE.md` for detailed setup and testing instructions.
