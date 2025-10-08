// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

package com.proofofpassportapp.ui

import android.view.Choreographer
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

class QRCodeScannerViewManager(
    open val reactContext: ReactApplicationContext
) : ViewGroupManager<FrameLayout>(), QrCodeScannerFragment.QRCodeScannerCallback {
    private var propWidth: Int? = null
    private var propHeight: Int? = null
    private var reactNativeViewId: Int? = null

    override fun getName() = REACT_CLASS

    /**
     * Return a FrameLayout which will later hold the Fragment
     */
    override fun createViewInstance(reactContext: ThemedReactContext) =
        FrameLayout(reactContext)

    override fun onDropViewInstance(view: FrameLayout) {
        android.util.Log.d("QRCodeScanner", "onDropViewInstance - stopping camera")
        reactNativeViewId?.let { viewId ->
            destroyFragment(view, viewId)
        }
        super.onDropViewInstance(view)
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
        commandId: String,
        args: ReadableArray?
    ) {
        super.receiveCommand(root, commandId, args)
        val reactNativeViewId = requireNotNull(args).getInt(0)

        when (commandId.toInt()) {
            COMMAND_CREATE -> createFragment(root, reactNativeViewId)
            COMMAND_DESTROY -> destroyFragment(root, reactNativeViewId)
        }
    }

    @ReactPropGroup(names = ["width", "height"], customType = "Style")
    fun setStyle(view: FrameLayout, index: Int, value: Int) {
        if (index == 0) propWidth = value
        if (index == 1) propHeight = value
    }

    /**
     * Replace your React Native view with a custom fragment
     */
    private fun createFragment(root: FrameLayout, reactNativeViewId: Int) {
        this.reactNativeViewId = reactNativeViewId
        val parentView = root.findViewById<ViewGroup>(reactNativeViewId)
        setupLayout(parentView)

        val qrScannerFragment = QrCodeScannerFragment(this)
        val activity = reactContext.currentActivity as FragmentActivity
        activity.supportFragmentManager
            .beginTransaction()
            .replace(reactNativeViewId, qrScannerFragment, reactNativeViewId.toString())
            .commit()
    }

    private fun destroyFragment(root: FrameLayout, reactNativeViewId: Int) {
        val activity = reactContext.currentActivity as FragmentActivity
        val qrScannerFragment = activity.supportFragmentManager.findFragmentByTag(reactNativeViewId.toString())
        qrScannerFragment?.let {
            if (it is QrCodeScannerFragment) {
                it.forceStopCamera()
            }
            activity.supportFragmentManager
                .beginTransaction()
                .remove(it)
                .commit()
        }
    }


    private fun setupLayout(view: View) {
        Choreographer.getInstance().postFrameCallback(object: Choreographer.FrameCallback {
            override fun doFrame(frameTimeNanos: Long) {
                manuallyLayoutChildren(view)
                view.viewTreeObserver.dispatchOnGlobalLayout()
                Choreographer.getInstance().postFrameCallback(this)
            }
        })
    }

    /**
     * Layout all children properly
     */
    private fun manuallyLayoutChildren(view: View) {
        // propWidth and propHeight coming from react-native props
        val width = requireNotNull(propWidth)
        val height = requireNotNull(propHeight)

        view.measure(
            View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY),
            View.MeasureSpec.makeMeasureSpec(height, View.MeasureSpec.EXACTLY))

        view.layout(0, 0, width, height)
    }

    companion object {
        private const val REACT_CLASS = "QRCodeScannerViewManager"
        private const val COMMAND_CREATE = 1
        private const val COMMAND_DESTROY = 2
        private const val SUCCESS_EVENT = "onQRCodeReadResult"
        private const val FAILURE_EVENT = "onQRCodeReadError"
    }


    override fun onQRData(data: String) {
        val event = Arguments.createMap()
        event.putString("data", data)
        reactContext
            .getJSModule(RCTEventEmitter::class.java)
            .receiveEvent(this.reactNativeViewId!!, SUCCESS_EVENT, event)
    }

    override fun onError(e: Exception) {
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
