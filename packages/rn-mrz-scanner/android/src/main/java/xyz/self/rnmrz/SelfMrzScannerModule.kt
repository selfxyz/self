// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.rnmrz

import android.Manifest
import android.content.pm.PackageManager
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.FrameLayout
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import org.json.JSONObject
import xyz.self.sdk.ocr.AndroidCameraMrzProvider
import java.util.concurrent.atomic.AtomicBoolean

/**
 * RN native module backing `CameraHandler` in `@selfxyz/rn-sdk`. Presents a full-screen camera
 * preview over the current Activity and adapts the canonical `xyz.self.sdk:ocr`
 * [AndroidCameraMrzProvider] result to the `{ documentNumber, dateOfBirth, dateOfExpiry, ... }`
 * shape the handler expects.
 *
 * Rejection codes are the ones `CameraHandler` maps: `CAMERA_PERMISSION_DENIED`,
 * `CAMERA_INIT_FAILED`, `MRZ_SCAN_CANCELLED`.
 */
class SelfMrzScannerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = MODULE_NAME

    private var provider: AndroidCameraMrzProvider? = null
    private var overlay: FrameLayout? = null

    @ReactMethod
    fun startScanning(promise: Promise) {
        val activity = reactContext.currentActivity
        if (activity == null) {
            promise.reject("CAMERA_INIT_FAILED", "No foreground activity to host the scanner")
            return
        }

        val granted = ContextCompat.checkSelfPermission(activity, Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED
        if (granted) {
            startScanning(promise, resolveOnce = AtomicBoolean(false))
            return
        }

        val permissionAware = activity as? PermissionAwareActivity
        if (permissionAware == null) {
            promise.reject("CAMERA_INIT_FAILED", "Host activity cannot request camera permission")
            return
        }
        permissionAware.requestPermissions(
            arrayOf(Manifest.permission.CAMERA),
            PERMISSION_REQUEST_CODE,
            PermissionListener { requestCode, _, grantResults ->
                if (requestCode != PERMISSION_REQUEST_CODE) return@PermissionListener false
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    startScanning(promise, resolveOnce = AtomicBoolean(false))
                } else {
                    promise.reject("CAMERA_PERMISSION_DENIED", "Camera permission denied")
                }
                true
            },
        )
    }

    private fun startScanning(promise: Promise, resolveOnce: AtomicBoolean) {
        UiThreadUtil.runOnUiThread {
            val activity = reactContext.currentActivity
            if (activity == null) {
                if (resolveOnce.compareAndSet(false, true)) {
                    promise.reject("CAMERA_INIT_FAILED", "Activity was lost before scanning started")
                }
                return@runOnUiThread
            }

            val container = FrameLayout(activity)
            val cancelButton = Button(activity).apply {
                text = "Cancel"
                setOnClickListener {
                    if (resolveOnce.compareAndSet(false, true)) {
                        teardown()
                        promise.reject("MRZ_SCAN_CANCELLED", "MRZ scan cancelled")
                    }
                }
            }
            container.addView(
                cancelButton,
                FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                ).apply { gravity = Gravity.TOP or Gravity.END },
            )
            activity.addContentView(
                container,
                ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                ),
            )
            overlay = container

            val mrzProvider = AndroidCameraMrzProvider(activity)
            provider = mrzProvider

            mrzProvider.scanMrzWithPreview(
                container,
                onMrzDetected = { json ->
                    if (resolveOnce.compareAndSet(false, true)) {
                        teardown()
                        promise.resolve(toResult(json))
                    }
                },
                onProgress = { /* frame-level progress is not surfaced over the bridge */ },
                onError = { message ->
                    if (resolveOnce.compareAndSet(false, true)) {
                        teardown()
                        promise.reject("CAMERA_INIT_FAILED", message ?: "Failed to start camera")
                    }
                },
            )
        }
    }

    private fun teardown() {
        UiThreadUtil.runOnUiThread {
            provider?.close()
            provider = null
            overlay?.let { (it.parent as? ViewGroup)?.removeView(it) }
            overlay = null
        }
    }

    private fun toResult(json: String): WritableMap {
        val obj = JSONObject(json)
        return Arguments.createMap().apply {
            putString("documentNumber", obj.optString("documentNumber"))
            putString("dateOfBirth", obj.optString("dateOfBirth"))
            putString("dateOfExpiry", obj.optString("dateOfExpiry"))
            obj.optString("documentType").takeIf { it.isNotEmpty() }?.let { putString("documentType", it) }
            // AndroidCameraMrzProvider emits issuingState (ISO country of issuance); expose it as
            // countryCode to match the CameraHandler contract.
            obj.optString("issuingState").takeIf { it.isNotEmpty() }?.let { putString("countryCode", it) }
        }
    }

    override fun invalidate() {
        teardown()
        super.invalidate()
    }

    private companion object {
        const val MODULE_NAME = "SelfMRZScannerModule"
        const val PERMISSION_REQUEST_CODE = 0x5E1F
    }
}
