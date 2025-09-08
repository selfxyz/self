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
import com.selfxyz.selfSDK.ui.CameraMLKitFragment
import org.jmrtd.lds.icao.MRZInfo

class SelfMRZScannerModule(reactContext: ReactApplicationContext) :
ReactContextBaseJavaModule(reactContext), CameraMLKitFragment.CameraMLKitCallback {
    override fun getName() = "SelfMRZScannerModule"

    private var scanPromise: Promise? = null

    @ReactMethod
    fun startScanning(promise: Promise) {
      scanPromise = promise
        val activity = reactApplicationContext.currentActivity as? FragmentActivity ?: return

      activity.runOnUiThread {
        val container = FrameLayout(activity)
        val containerId = View.generateViewId()
        container.id = containerId

        activity.addContentView(container, ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ))

        activity.supportFragmentManager
            .beginTransaction()
            .replace(containerId, CameraMLKitFragment(this))
            .commit()
        }
    }

    override fun onPassportRead(mrzInfo: MRZInfo) {
        scanPromise?.resolve(mrzInfo.toString())
        scanPromise = null
    }

    override fun onError(e: Exception) {
        scanPromise?.reject(e)
        scanPromise = null
    }
}
