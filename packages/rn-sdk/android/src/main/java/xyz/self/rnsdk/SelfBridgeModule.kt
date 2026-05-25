// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.rnsdk

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import xyz.self.sdk.bridge.MessageRouter
import xyz.self.sdk.handlers.SecureStorageBridgeHandler
import xyz.self.sdk.providers.EncryptedSharedPreferencesProvider
import xyz.self.sdk.providers.SdkProviderRegistry

class SelfBridgeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = MODULE_NAME

    private val router: MessageRouter

    init {
        if (SdkProviderRegistry.secureStorage == null) {
            SdkProviderRegistry.secureStorage = EncryptedSharedPreferencesProvider(reactContext.applicationContext)
        }
        router = MessageRouter(sendToWebView = { jsCode -> emitInjection(jsCode) })
        router.register(SecureStorageBridgeHandler())
    }

    @ReactMethod
    fun routeMessage(rawJson: String) {
        router.onMessageReceived(rawJson, isTrustedSource = true)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required by RN for NativeEventEmitter; no-op.
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required by RN for NativeEventEmitter; no-op.
    }

    private fun emitInjection(jsCode: String) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(EVENT_NAME, jsCode)
    }

    companion object {
        const val MODULE_NAME = "SelfBridge"
        const val EVENT_NAME = "SelfBridge:injection"
    }
}
