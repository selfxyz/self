// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import SwiftUI
import ComposeApp
import SelfSdkSwift

// MARK: - Protocol conformance declarations
// These bridge the SelfSdkSwift implementations to the Kotlin provider protocols
// exported from the ComposeApp (KMP) framework.

extension BiometricProviderImpl: BiometricProvider {}
extension SecureStorageProviderImpl: SecureStorageProvider {}
extension HapticProviderImpl: HapticProvider {}
extension CryptoProviderImpl: CryptoProvider {}
extension DocumentsProviderImpl: DocumentsProvider {}
extension WebViewProviderImpl: WebViewProvider {}
extension NfcProviderImpl: NfcProvider {}
extension CameraMrzProviderImpl: CameraMrzProvider {}

@main
struct iOSApp: App {
    init() {
        // Register all Swift provider implementations with the KMP SdkProviderRegistry
        let registry = SdkProviderRegistry.shared
        registry.biometric = BiometricProviderImpl()
        registry.secureStorage = SecureStorageProviderImpl()
        registry.haptic = HapticProviderImpl()
        registry.crypto = CryptoProviderImpl()
        registry.documents = DocumentsProviderImpl()
        registry.webView = WebViewProviderImpl()
        registry.nfc = NfcProviderImpl()
        registry.cameraMrz = CameraMrzProviderImpl()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
