// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.minipay.screens

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import xyz.self.minipay.webview.BridgeMethodException
import xyz.self.minipay.webview.MethodRegistry
import xyz.self.minipay.webview.ProviderError
import xyz.self.minipay.webview.ProviderErrorCodes

@Composable
fun WebViewBridgeScreen() {
    val registry =
        remember {
            MethodRegistry().apply {
                registerMethod("demo_echo") { params ->
                    Result.success(
                        buildJsonObject {
                            put("ok", JsonPrimitive(true))
                            put("echo", params)
                        },
                    )
                }

                registerMethod("demo_reject") {
                    Result.failure(
                        BridgeMethodException(
                            ProviderError(
                                code = ProviderErrorCodes.INVALID_PARAMS,
                                message = "demo_reject always fails",
                            ),
                        ),
                    )
                }
            }
        }

    PlatformWebViewBridge(registry = registry)
}

@Composable
expect fun PlatformWebViewBridge(registry: MethodRegistry)
