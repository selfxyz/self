// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.minipay

import androidx.activity.ComponentActivity
import xyz.self.sdk.api.SelfSdk
import xyz.self.sdk.api.SelfSdkCallback
import xyz.self.sdk.api.VerificationRequest

actual fun platformLaunch(
    sdk: SelfSdk,
    request: VerificationRequest,
    callback: SelfSdkCallback,
    platformContext: Any?,
) {
    val activity = platformContext as? ComponentActivity
        ?: error("platformContext must be a ComponentActivity on Android")
    sdk.launch(activity, request, callback)
}
