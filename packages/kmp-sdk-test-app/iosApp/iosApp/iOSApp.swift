// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import SwiftUI
import ComposeApp
import SelfSdkSwift

// MARK: - Protocol conformance for required providers
extension SecureStorageProviderImpl: SecureStorageProvider {}
extension CryptoProviderImpl: CryptoProvider {}
extension WebViewProviderImpl: WebViewProvider {}

@main
struct iOSApp: App {
    init() {
        // Register only the 3-domain required providers
        SdkProviderRegistry.shared.secureStorage = SecureStorageProviderImpl()
        SdkProviderRegistry.shared.crypto = CryptoProviderImpl()
        IosProviderRegistry.shared.webView = WebViewProviderImpl()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
