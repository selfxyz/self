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
import org.jmrtd.lds.icao.MRZInfo


class PassportOCRViewManager(
    open val reactContext: ReactApplicationContext
) : ViewGroupManager<FrameLayout>(), CameraMLKitFragment.CameraMLKitCallback {
    private var propWidth: Int? = null
    private var propHeight: Int? = null
    private var reactNativeViewId: Int? = null

    override fun getName() = REACT_CLASS

    /**
     * Return a FrameLayout which will later hold the Fragment
     */
    override fun createViewInstance(reactContext: ThemedReactContext) =
        FrameLayout(reactContext)

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

        val cameraFragment = CameraMLKitFragment(this)
        val activity = reactContext.currentActivity as FragmentActivity
        activity.supportFragmentManager
            .beginTransaction()
            .replace(reactNativeViewId, cameraFragment, reactNativeViewId.toString())
            .commit()
    }

    private fun destroyFragment(root: FrameLayout, reactNativeViewId: Int) {
        val parentView = root.findViewById<ViewGroup>(reactNativeViewId)
        setupLayout(parentView)

        val activity = reactContext.currentActivity as FragmentActivity
        val cameraFragment = activity.supportFragmentManager.findFragmentByTag(reactNativeViewId.toString())
        cameraFragment?.let {
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
        private const val REACT_CLASS = "PassportOCRViewManager"
        private const val COMMAND_CREATE = 1
        private const val COMMAND_DESTROY = 2
        private const val SUCCESS_EVENT = "onPassportReadResult"
        private const val FAILURE_EVENT = "onPassportReadError"
    }


    override fun onPassportRead(mrzInfo: MRZInfo) {
        val event = Arguments.createMap()
        event.putString("data", mrzInfo.toString())
        reactContext
            .getJSModule(RCTEventEmitter::class.java)
            .receiveEvent(this.reactNativeViewId!!, SUCCESS_EVENT, event)
    }

    override fun onError(e: Exception) {
        val event = Arguments.createMap()
        event.putString("errorMessage", "Something went wrong scanning MRZ with camera")
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
                    "bubbled" to "onPassportRead"
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
