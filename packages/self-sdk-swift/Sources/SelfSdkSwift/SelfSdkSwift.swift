// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation

/// Main entry point for the Self SDK Swift companion package.
/// Provides native iOS provider implementations for the KMP SDK.
///
/// Usage: In your iOS app (which imports both the KMP framework and this package),
/// register providers with the KMP SdkProviderRegistry:
///
/// ```swift
/// import SelfSdk       // KMP framework
/// import SelfSdkSwift  // This package
///
/// // In your App init or AppDelegate:
/// SdkProviderRegistry.shared.biometric = SelfSdkSwift.biometric
/// SdkProviderRegistry.shared.secureStorage = SelfSdkSwift.secureStorage
/// SdkProviderRegistry.shared.haptic = SelfSdkSwift.haptic
/// SdkProviderRegistry.shared.crypto = SelfSdkSwift.crypto
/// SdkProviderRegistry.shared.documents = SelfSdkSwift.documents
/// SdkProviderRegistry.shared.webView = SelfSdkSwift.webView
/// SdkProviderRegistry.shared.nfc = SelfSdkSwift.nfc
/// SdkProviderRegistry.shared.cameraMrz = SelfSdkSwift.cameraMrz
/// ```
public final class SelfSdkSwift {

    /// All provider implementations, ready to be registered.
    public static let biometric = BiometricProviderImpl()
    public static let secureStorage = SecureStorageProviderImpl()
    public static let haptic = HapticProviderImpl()
    public static let crypto = CryptoProviderImpl()
    public static let documents = DocumentsProviderImpl()
    public static let webView = WebViewProviderImpl()
    public static let nfc = NfcProviderImpl()
    public static let cameraMrz = CameraMrzProviderImpl()
}
