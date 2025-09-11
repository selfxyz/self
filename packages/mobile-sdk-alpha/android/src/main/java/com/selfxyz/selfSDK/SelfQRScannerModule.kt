// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package com.selfxyz.selfSDK

import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import android.view.ViewGroup
import android.view.View
import android.widget.FrameLayout
import com.selfxyz.selfSDK.ui.QrCodeScannerFragment

class SelfQRScannerModule(reactContext: ReactApplicationContext) :
ReactContextBaseJavaModule(reactContext), QrCodeScannerFragment.QRCodeScannerCallback {
    override fun getName() = "SelfQRScannerModule"

    private var scanPromise: Promise? = null
    private var currentContainer: FrameLayout? = null
    private var currentFragment: QrCodeScannerFragment? = null

    @ReactMethod
    fun startScanning(promise: Promise) {
        scanPromise = promise
        val activity = reactApplicationContext.currentActivity as? FragmentActivity
        if (activity == null) {
            promise.reject("E_NO_ACTIVITY", "No FragmentActivity found")
            return
        }

        activity.runOnUiThread {
            try {
                val container = FrameLayout(activity)
                // just using view.generateViewId() doesn't work.
                val containerId = generateUnusedId(activity.window.decorView as ViewGroup)
                container.id = containerId

                container.layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )

                container.isFocusable = true
                container.isFocusableInTouchMode = true
                container.setBackgroundColor(android.graphics.Color.BLACK)

                activity.addContentView(container, ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                ))

                val fragment = QrCodeScannerFragment(this@SelfQRScannerModule)

                // Store references for cleanup
                currentContainer = container
                currentFragment = fragment

                activity.supportFragmentManager
                    .beginTransaction()
                    .replace(containerId, fragment)
                    .commitNow()

            } catch (e: Exception) {
                android.util.Log.e("SelfQRScannerModule", "Error in startScanning", e)
                promise.reject("E_SCANNING_ERROR", e.message, e)
            }
        }
    }

    override fun onQRData(data: String) {
        scanPromise?.resolve(data)
        scanPromise = null
        cleanup()
    }

    override fun onError(e: Exception) {
        scanPromise?.reject("E_QR_SCAN_ERROR", e.message, e)
        scanPromise = null
        cleanup()
    }

    private fun cleanup() {
        val activity = reactApplicationContext.currentActivity as? FragmentActivity
        activity?.runOnUiThread {
            currentFragment?.let { fragment ->
                activity.supportFragmentManager
                    .beginTransaction()
                    .remove(fragment)
                    .commit()
            }
            currentContainer?.let { container ->
                (container.parent as? ViewGroup)?.removeView(container)
            }
            currentContainer = null
            currentFragment = null
        }
    }

    private fun generateUnusedId(parent: ViewGroup): Int {
        var id = View.generateViewId()
        while (parent.findViewById<View>(id) != null) {
            id = View.generateViewId()
        }
        return id
    }
}
