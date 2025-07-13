// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

package com.proofofpassportapp.ui

import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactPropGroup
import com.facebook.react.uimanager.events.RCTEventEmitter
import java.lang.ref.WeakReference

class QRCodeScannerViewManager(
    open val reactContext: ReactApplicationContext
) : ViewGroupManager<FrameLayout>(), QrCodeScannerFragment.QRCodeScannerCallback {
    private var propWidth: Int? = null
    private var propHeight: Int? = null
    private var reactNativeViewId: Int? = null
    private var layoutHandler: Handler? = null
    private var layoutRunnable: Runnable? = null

    override fun getName() = REACT_CLASS

    /**
     * Return a FrameLayout which will later hold the Fragment
     */
    override fun createViewInstance(reactContext: ThemedReactContext) =
        FrameLayout(reactContext).also {
            Log.d(TAG, "createViewInstance: Created FrameLayout with id ${it.id}")
        }

    /**
     * Map the "create" command to an integer
     */
    override fun getCommandsMap() = mapOf(
        "create" to COMMAND_CREATE,
        "destroy" to COMMAND_DESTROY
    )

    /**
     * Handle "create" command (called from JS) and call createFragment method
     */
    override fun receiveCommand(
        root: FrameLayout,
        commandId: Int,
        args: ReadableArray?
    ) {
        val reactNativeViewId = args?.getInt(0) ?: return
        Log.d(TAG, "receiveCommand: commandId=$commandId, reactNativeViewId=$reactNativeViewId")

        when (commandId) {
            COMMAND_CREATE -> createFragment(root, reactNativeViewId)
            COMMAND_DESTROY -> destroyFragment(root, reactNativeViewId)
        }
    }

    @ReactPropGroup(names = ["width", "height"], customType = "Style")
    fun setStyle(view: FrameLayout, index: Int, value: Int) {
        if (index == 0) propWidth = value
        if (index == 1) propHeight = value
        Log.d(TAG, "setStyle: index=$index, value=$value")
    }

    /**
     * Replace your React Native view with a custom fragment
     */
    private fun createFragment(root: FrameLayout, reactNativeViewId: Int) {
        Log.d(TAG, "createFragment: Starting fragment creation for reactNativeViewId=$reactNativeViewId")
        this.reactNativeViewId = reactNativeViewId
        val parentView = root.findViewById<ViewGroup>(reactNativeViewId)
        Log.d(TAG, "createFragment: parentView=${parentView != null}")

        setupLayout(parentView)

        val qrScannerFragment = QrCodeScannerFragment(this)
        Log.d(TAG, "createFragment: Created QrCodeScannerFragment")

        val activity = reactContext.currentActivity as FragmentActivity
        Log.d(TAG, "createFragment: activity=${activity != null}, isFinishing=${activity.isFinishing}")

        try {
            activity.supportFragmentManager
                .beginTransaction()
                .replace(reactNativeViewId, qrScannerFragment, reactNativeViewId.toString())
                .commit()
            Log.d(TAG, "createFragment: Fragment transaction committed successfully")
        } catch (e: Exception) {
            Log.e(TAG, "createFragment: Error during fragment transaction", e)
        }
    }

    private fun destroyFragment(root: FrameLayout, reactNativeViewId: Int) {
        Log.d(TAG, "destroyFragment: Destroying fragment for reactNativeViewId=$reactNativeViewId")
        stopLayoutLoop()
        val parentView = root.findViewById<ViewGroup>(reactNativeViewId)
        setupLayout(parentView)

        val activity = reactContext.currentActivity as FragmentActivity
        val qrScannerFragment = activity.supportFragmentManager.findFragmentByTag(reactNativeViewId.toString())
        Log.d(TAG, "destroyFragment: Found fragment=${qrScannerFragment != null}")

        qrScannerFragment?.let {
            try {
                activity.supportFragmentManager
                    .beginTransaction()
                    .remove(it)
                    .commit()
                Log.d(TAG, "destroyFragment: Fragment removed successfully")
            } catch (e: Exception) {
                Log.e(TAG, "destroyFragment: Error removing fragment", e)
            }
        }
    }

    private fun setupLayout(view: View) {
        Log.d(TAG, "setupLayout: Setting up layout for view")
        stopLayoutLoop()

        val weakView = WeakReference(view)
        layoutHandler = Handler(Looper.getMainLooper())
        layoutRunnable = object : Runnable {
            override fun run() {
                val currentView = weakView.get()
                if (currentView != null && currentView.parent != null) {
                    // Critical: Always update both layout and surface for camera preview
                    manuallyLayoutChildren(currentView)
                    currentView.viewTreeObserver.dispatchOnGlobalLayout()
                    // Maintain frame-by-frame updates for camera preview
                    layoutHandler?.post(this)
                } else {
                    Log.d(TAG, "setupLayout: View no longer valid, stopping layout loop")
                    layoutRunnable = null
                }
            }
        }
        // Initial setup
        manuallyLayoutChildren(view)
        view.viewTreeObserver.dispatchOnGlobalLayout()
        layoutHandler?.post(layoutRunnable!!)
    }

    private fun stopLayoutLoop() {
        layoutRunnable?.let { runnable ->
            layoutHandler?.removeCallbacks(runnable)
            Log.d(TAG, "stopLayoutLoop: Stopped layout callback")
        }
        layoutRunnable = null
        layoutHandler = null
    }

    /**
     * Layout all children properly
     */
    private fun manuallyLayoutChildren(view: View) {
        val width = propWidth ?: return
        val height = propHeight ?: return

        Log.d(TAG, "manuallyLayoutChildren: width=$width, height=$height")
        view.measure(
            View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY),
            View.MeasureSpec.makeMeasureSpec(height, View.MeasureSpec.EXACTLY)
        )
        view.layout(0, 0, width, height)
        Log.d(TAG, "manuallyLayoutChildren: Layout completed")
    }

    override fun onDropViewInstance(view: FrameLayout) {
        Log.d(TAG, "onDropViewInstance: Dropping view instance")
        stopLayoutLoop()
        super.onDropViewInstance(view)
    }

    companion object {
        private const val REACT_CLASS = "QRCodeScannerViewManager"
        private const val COMMAND_CREATE = 1
        private const val COMMAND_DESTROY = 2
        private const val SUCCESS_EVENT = "onQRCodeReadResult"
        private const val FAILURE_EVENT = "onQRCodeReadError"
        private const val TAG = "QRCodeScannerViewManager"
    }

    override fun onQRData(data: String) {
        Log.d(TAG, "onQRData: Received QR data: $data")
        val event = Arguments.createMap()
        event.putString("data", data)
        reactContext
            .getJSModule(RCTEventEmitter::class.java)
            .receiveEvent(this.reactNativeViewId!!, SUCCESS_EVENT, event)
    }

    override fun onError(e: Exception) {
        Log.e(TAG, "onError: QR scanner error", e)
        val event = Arguments.createMap()
        event.putString("errorMessage", "Something went wrong scanning the QR Code")
        event.putString("error", e.toString())
        event.putString("stackTrace", e.stackTraceToString())
        reactContext
            .getJSModule(RCTEventEmitter::class.java)
            .receiveEvent(this.reactNativeViewId!!, FAILURE_EVENT, event)
    }

    override fun getExportedCustomBubblingEventTypeConstants(): Map<String, Any> {
        return mapOf(
            SUCCESS_EVENT to mapOf(
                "phasedRegistrationNames" to mapOf(
                    "bubbled" to "onQRData"
                )
            ),
            FAILURE_EVENT to mapOf(
                "phasedRegistrationNames" to mapOf(
                    "bubbled" to "onError"
                )
            )
        )
    }
}
