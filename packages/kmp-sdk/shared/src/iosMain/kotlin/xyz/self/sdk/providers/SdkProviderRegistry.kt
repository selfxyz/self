// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.providers

object SdkProviderRegistry {
    var biometric: BiometricProvider? = null
    var secureStorage: SecureStorageProvider? = null
    var haptic: HapticProvider? = null
    var crypto: CryptoProvider? = null
    var documents: DocumentsProvider? = null
    var nfc: NfcProvider? = null
    var cameraMrz: CameraMrzProvider? = null
    var webView: WebViewProvider? = null

    fun isConfigured(): Boolean =
        biometric != null &&
            secureStorage != null &&
            crypto != null &&
            documents != null &&
            nfc != null &&
            cameraMrz != null &&
            webView != null
}
