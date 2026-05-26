// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.rnsdk

import android.util.Log
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class SelfCryptoPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        val modules = mutableListOf<NativeModule>(SelfCryptoModule(reactContext))
        // SelfBridgeModule depends on the optional KMP shared AAR. Skip
        // registration if those classes aren't on the runtime classpath so
        // consumers that haven't opted in to the bridge build cleanly.
        try {
            modules += SelfBridgeModule(reactContext)
        } catch (e: NoClassDefFoundError) {
            Log.i(TAG, "KMP bridge classes not present; SelfBridgeModule disabled")
        } catch (e: ClassNotFoundException) {
            Log.i(TAG, "KMP bridge classes not present; SelfBridgeModule disabled")
        }
        return modules
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()

    private companion object {
        const val TAG = "SelfCryptoPackage"
    }
}
