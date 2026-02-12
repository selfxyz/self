// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.android

import android.content.Context
import android.content.pm.PackageManager
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException

/**
 * Bridge handler for camera-based MRZ scanning on Android.
 *
 * Checks camera availability and signals when the native camera UI
 * should be launched for MRZ (Machine Readable Zone) scanning via
 * ML Kit text recognition.
 *
 * The actual camera Activity and ML Kit integration is left to the
 * host application; this handler throws [BridgeHandlerException] with
 * code "LAUNCH_NATIVE_CAMERA" to indicate that the native camera
 * should be presented.
 *
 * @param context Application context for checking hardware features.
 */
class CameraMrzBridgeHandler(
    private val context: Context,
) : BridgeHandler {

    override val domain = BridgeDomain.CAMERA

    override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement? {
        return when (method) {
            "isAvailable" -> {
                val hasCamera = context.packageManager.hasSystemFeature(
                    PackageManager.FEATURE_CAMERA_ANY,
                )
                buildJsonObject { put("available", hasCamera) }
            }
            "scanMRZ" -> {
                // MRZ scanning via ML Kit requires a native camera Activity.
                // Signal to the host application that it should launch the
                // camera UI and return the result through the bridge.
                throw BridgeHandlerException(
                    "LAUNCH_NATIVE_CAMERA",
                    "MRZ scanning requires native camera UI",
                )
            }
            else -> throw BridgeHandlerException(
                "UNKNOWN_METHOD",
                "Unknown camera method: $method",
            )
        }
    }
}
