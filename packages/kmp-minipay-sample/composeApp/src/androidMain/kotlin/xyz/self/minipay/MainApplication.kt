// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.minipay

import android.app.Application
import xyz.self.sdk.api.SelfSdk
import xyz.self.sdk.api.SelfSdkConfig

class MainApplication : Application() {
    lateinit var sdk: SelfSdk
        private set

    override fun onCreate() {
        super.onCreate()
        sdk = SelfSdk.configure(SelfSdkConfig(debug = false))
    }
}
