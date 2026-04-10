// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.providers

object IosProviderRegistry {
    var biometric: BiometricProvider? = null
    var haptic: HapticProvider? = null
    var documents: DocumentsProvider? = null
    var nfc: NfcProvider? = null
    var cameraMrz: CameraMrzProvider? = null
    var webView: WebViewProvider? = null
    var isDebugBuild: Boolean = false

    fun isFullyConfigured(): Boolean =
        SdkProviderRegistry.isConfigured() &&
            biometric != null &&
            documents != null &&
            nfc != null &&
            cameraMrz != null &&
            webView != null

    fun reset() {
        SdkProviderRegistry.reset()
        biometric = null
        haptic = null
        documents = null
        nfc = null
        cameraMrz = null
        webView = null
        isDebugBuild = false
    }
}
