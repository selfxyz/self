// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.testapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import xyz.self.sdk.api.SelfSdk
import xyz.self.sdk.providers.AndroidKeystoreCryptoProvider
import xyz.self.sdk.providers.EncryptedSharedPreferencesProvider
import xyz.self.sdk.providers.SdkProviderRegistry

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Register default providers so DomainSmokeScreen can test them directly
        if (SdkProviderRegistry.secureStorage == null) {
            SdkProviderRegistry.secureStorage = EncryptedSharedPreferencesProvider(this)
        }
        if (SdkProviderRegistry.crypto == null) {
            SdkProviderRegistry.crypto = AndroidKeystoreCryptoProvider()
        }

        SelfSdk.bindActivity(this)
        enableEdgeToEdge()
        setContent {
            App()
        }
    }
}
