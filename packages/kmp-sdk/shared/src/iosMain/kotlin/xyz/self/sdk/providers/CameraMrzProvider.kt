// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.providers

import kotlinx.cinterop.ExperimentalForeignApi
import platform.UIKit.UIView

@OptIn(ExperimentalForeignApi::class)
interface CameraMrzProvider {
    fun isAvailable(): Boolean

    fun createCameraView(
        onMrzDetected: (String) -> Unit,
        onProgress: (Any) -> Unit,
        onError: (String) -> Unit,
    ): UIView

    fun stopCamera()
}
