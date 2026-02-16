// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.handlers

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.jsonPrimitive
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException

/**
 * Android implementation of haptic feedback bridge handler.
 * Uses Vibrator service to provide tactile feedback.
 */
class HapticBridgeHandler(
    private val context: Context,
) : BridgeHandler {
    override val domain = BridgeDomain.HAPTIC

    private val vibrator: Vibrator by lazy {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
    }

    override suspend fun handle(
        method: String,
        params: Map<String, JsonElement>,
    ): JsonElement? =
        when (method) {
            "trigger" -> trigger(params)
            "isAvailable" -> isAvailable()
            else -> throw BridgeHandlerException(
                "METHOD_NOT_FOUND",
                "Unknown haptic method: $method",
            )
        }

    /**
     * Triggers haptic feedback with specified intensity.
     * Fire-and-forget operation - always returns null.
     */
    private fun trigger(params: Map<String, JsonElement>): JsonElement? {
        val type = params["type"]?.jsonPrimitive?.content ?: "medium"

        // Check if vibrator is available
        if (!vibrator.hasVibrator()) {
            // Silently fail - not all devices have vibration
            return null
        }

        // Determine vibration parameters based on type
        val (duration, amplitude) =
            when (type) {
                "light" -> Pair(20L, 50)
                "medium" -> Pair(40L, 128)
                "heavy" -> Pair(60L, 255)
                "success" -> Pair(30L, 128)
                "warning" -> Pair(50L, 200)
                "error" -> Pair(80L, 255)
                else -> Pair(40L, 128) // Default to medium
            }

        // Trigger vibration
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val effect = VibrationEffect.createOneShot(duration, amplitude)
            vibrator.vibrate(effect)
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(duration)
        }

        return null // Fire-and-forget
    }

    /**
     * Checks if haptic feedback is available on this device.
     */
    private fun isAvailable(): JsonElement {
        val available = vibrator.hasVibrator()
        return kotlinx.serialization.json.JsonPrimitive(available)
    }
}
