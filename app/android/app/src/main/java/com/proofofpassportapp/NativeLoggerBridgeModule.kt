// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

package com.proofofpassportapp

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

class NativeLoggerBridgeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "NativeLoggerBridge"
    }

    companion object {
        private fun sendLogEvent(context: ReactApplicationContext, level: String, category: String, message: String, data: Map<String, Any>? = null) {
            val params: WritableMap = Arguments.createMap().apply {
                putString("level", level)
                putString("category", category)
                putString("message", message)
                if (data != null && data.isNotEmpty()) {
                    val dataMap = Arguments.createMap()
                    data.forEach { (key, value) ->
                        when (value) {
                            is String -> dataMap.putString(key, value)
                            is Int -> dataMap.putInt(key, value)
                            is Double -> dataMap.putDouble(key, value)
                            is Boolean -> dataMap.putBoolean(key, value)
                            else -> dataMap.putString(key, value.toString())
                        }
                    }
                    putMap("data", dataMap)
                }
            }

            context
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("logEvent", params)
        }

        fun logDebug(context: ReactApplicationContext, category: String, message: String, data: Map<String, Any>? = null) {
            sendLogEvent(context, "debug", category, message, data)
        }

        fun logInfo(context: ReactApplicationContext, category: String, message: String, data: Map<String, Any>? = null) {
            sendLogEvent(context, "info", category, message, data)
        }

        fun logWarn(context: ReactApplicationContext, category: String, message: String, data: Map<String, Any>? = null) {
            sendLogEvent(context, "warn", category, message, data)
        }

        fun logError(context: ReactApplicationContext, category: String, message: String, data: Map<String, Any>? = null) {
            sendLogEvent(context, "error", category, message, data)
        }
    }
} 