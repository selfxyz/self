// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.providers

import kotlinx.cinterop.ExperimentalForeignApi
import platform.UIKit.UIView
import platform.UIKit.UIViewController

@OptIn(ExperimentalForeignApi::class)
interface WebViewProvider {
    fun createWebView(
        onMessageReceived: (String) -> Unit,
        isDebugMode: Boolean,
        queryParams: String? = null,
    ): UIView

    fun evaluateJs(js: String)

    fun getViewController(): UIViewController

    fun isBridgeRequestAllowed(): Boolean

    fun configureRemoteLoading(remoteWebAppBaseURL: String?) {}

    fun configureDevServer(devServerUrl: String?) {}
}
