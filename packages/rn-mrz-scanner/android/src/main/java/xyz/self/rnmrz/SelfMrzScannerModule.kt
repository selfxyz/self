// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.rnmrz

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Color
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
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import org.json.JSONObject
import xyz.self.sdk.ocr.AndroidCameraMrzProvider
import java.util.concurrent.atomic.AtomicBoolean

/**
 * RN native module backing `CameraHandler` in `@selfxyz/rn-sdk`. Presents a native CameraX
 * preview via the canonical `xyz.self.sdk:ocr` [AndroidCameraMrzProvider] and adapts its result
 * to the `{ documentNumber, dateOfBirth, dateOfExpiry, ... }` shape the handler expects.
 *
 * When the web viewfinder reports a `scanRect` (physical px, viewport-relative), the preview
 * overlay is sized/pinned to it so it sits over the web-designed viewfinder box — parity with
 * the KMP embedded-preview mode. Without a rect the overlay fills the screen and shows a native
 * Cancel button. The rect-pinned mode has no native chrome; cancel is web-driven via
 * `stopCamera` → [stopScanning].
 *
 * Rejection codes are the ones `CameraHandler` maps: `CAMERA_PERMISSION_DENIED`,
 * `CAMERA_INIT_FAILED`, `MRZ_SCAN_CANCELLED`.
 */
class SelfMrzScannerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = MODULE_NAME

    private var provider: AndroidCameraMrzProvider? = null
    private var overlay: FrameLayout? = null
    private var pendingCancel: (() -> Unit)? = null

    private data class ScanRect(val x: Int, val y: Int, val width: Int, val height: Int)

    @ReactMethod
    fun startScanning(options: ReadableMap, promise: Promise) {
        val activity = reactContext.currentActivity
        if (activity == null) {
            promise.reject("CAMERA_INIT_FAILED", "No foreground activity to host the scanner")
            return
        }

        val scanRect = parseScanRect(options)

        val granted = ContextCompat.checkSelfPermission(activity, Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED
        if (granted) {
            startScanning(promise, scanRect, resolveOnce = AtomicBoolean(false))
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
                    startScanning(promise, scanRect, resolveOnce = AtomicBoolean(false))
                } else {
                    promise.reject("CAMERA_PERMISSION_DENIED", "Camera permission denied")
                }
                true
            },
        )
    }

    /** Cancels an in-flight scan (web-driven, e.g. leaving the viewfinder route). Never rejects. */
    @ReactMethod
    fun stopScanning(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            pendingCancel?.invoke()
            promise.resolve(null)
        }
    }

    private fun startScanning(promise: Promise, scanRect: ScanRect?, resolveOnce: AtomicBoolean) {
        UiThreadUtil.runOnUiThread {
            val activity = reactContext.currentActivity
            if (activity == null) {
                if (resolveOnce.compareAndSet(false, true)) {
                    promise.reject("CAMERA_INIT_FAILED", "Activity was lost before scanning started")
                }
                return@runOnUiThread
            }

            val rejectOnce = { code: String, message: String ->
                if (resolveOnce.compareAndSet(false, true)) {
                    pendingCancel = null
                    teardown()
                    promise.reject(code, message)
                }
            }

            val container = FrameLayout(activity).apply { setBackgroundColor(Color.BLACK) }

            // Full-screen fallback carries a native Cancel affordance; the rect-pinned embedded
            // preview has no native chrome and relies on the web UI's cancel (stopCamera).
            if (scanRect == null) {
                val cancelButton = Button(activity).apply {
                    text = "Cancel"
                    setOnClickListener { rejectOnce("MRZ_SCAN_CANCELLED", "MRZ scan cancelled") }
                }
                container.addView(
                    cancelButton,
                    FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                    ).apply { gravity = Gravity.TOP or Gravity.END },
                )
            }

            val params = if (scanRect != null) {
                // scanRect is already physical px, viewport-relative; the content view origin
                // matches the WebView origin, so rect coords map to margins 1:1.
                FrameLayout.LayoutParams(scanRect.width, scanRect.height, Gravity.TOP or Gravity.START).apply {
                    leftMargin = scanRect.x
                    topMargin = scanRect.y
                }
            } else {
                FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                )
            }
            activity.addContentView(container, params)
            overlay = container
            pendingCancel = { rejectOnce("MRZ_SCAN_CANCELLED", "MRZ scan cancelled") }

            val mrzProvider = AndroidCameraMrzProvider(activity)
            provider = mrzProvider

            mrzProvider.scanMrzWithPreview(
                container,
                onMrzDetected = { json ->
                    if (resolveOnce.compareAndSet(false, true)) {
                        pendingCancel = null
                        teardown()
                        promise.resolve(toResult(json))
                    }
                },
                onProgress = { /* frame-level progress is not surfaced over the bridge */ },
                onError = { message ->
                    rejectOnce("CAMERA_INIT_FAILED", message.ifEmpty { "Failed to start camera" })
                },
            )
        }
    }

    private fun parseScanRect(options: ReadableMap?): ScanRect? {
        val rect = options?.takeIf { it.hasKey("scanRect") }?.getMap("scanRect") ?: return null
        val x = readInt(rect, "x") ?: return null
        val y = readInt(rect, "y") ?: return null
        val width = readInt(rect, "width") ?: return null
        val height = readInt(rect, "height") ?: return null
        return if (width > 0 && height > 0) ScanRect(x, y, width, height) else null
    }

    private fun readInt(map: ReadableMap, key: String): Int? =
        if (map.hasKey(key)) map.getDouble(key).toInt() else null

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
        pendingCancel = null
        teardown()
        super.invalidate()
    }

    private companion object {
        const val MODULE_NAME = "SelfMRZScannerModule"
        const val PERMISSION_REQUEST_CODE = 0x5E1F
    }
}
