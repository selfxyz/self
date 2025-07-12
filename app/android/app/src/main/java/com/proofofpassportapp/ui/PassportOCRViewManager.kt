// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

package com.proofofpassportapp.ui

import android.util.Log
import android.view.Choreographer
import android.view.View
import android.widget.FrameLayout
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.RCTEventEmitter
import com.proofofpassportapp.ui.CameraMLKitFragment.CameraMLKitCallback
import org.jmrtd.lds.icao.MRZInfo

class PassportOCRViewManager(private val reactContext: ReactApplicationContext) :
    ViewGroupManager<FrameLayout>(), CameraMLKitCallback {

    companion object {
        private const val TAG = "PassportOCRViewManager"
        private const val REACT_CLASS = "PassportOCRViewManager"
    }

    private var fragmentCreated = false
    private var propWidth: Int? = null
    private var propHeight: Int? = null

    override fun getName(): String {
        return REACT_CLASS
    }

    override fun createViewInstance(reactContext: ThemedReactContext): FrameLayout {
        return FrameLayout(reactContext)
    }

    override fun addView(parent: FrameLayout, child: View, index: Int) {
        super.addView(parent, child, index)
    }

    override fun onAfterUpdateTransaction(view: FrameLayout) {
        super.onAfterUpdateTransaction(view)
        createFragmentInContainer(view)
    }

    @ReactProp(name = "style")
    fun setStyle(view: FrameLayout, style: com.facebook.react.bridge.ReadableMap?) {
        style?.let {
            if (it.hasKey("width")) {
                propWidth = it.getInt("width")
            }
            if (it.hasKey("height")) {
                propHeight = it.getInt("height")
            }
        }
    }

    override fun getCommandsMap(): Map<String, Int> {
        return MapBuilder.of(
            "create", 1
        )
    }

    override fun receiveCommand(view: FrameLayout, commandId: Int, args: ReadableArray?) {
        when (commandId) {
            1 -> createFragmentInContainer(view)
        }
    }

    private fun createFragmentInContainer(container: FrameLayout) {
        if (fragmentCreated) {
            return
        }

        try {
            val activity = reactContext.currentActivity
            if (activity == null || activity !is FragmentActivity || activity.isFinishing || activity.isDestroyed) {
                Log.e(TAG, "Invalid activity state for fragment creation")
                return
            }

            // Ensure container has a unique ID
            if (container.id == View.NO_ID) {
                container.id = View.generateViewId()
            }

            val fragmentManager = activity.supportFragmentManager
            setupLayout(container)

            // Create the fragment
            val cameraFragment = CameraMLKitFragment(this)

            // Try fragment transaction first
            try {
                val transaction = fragmentManager.beginTransaction()
                transaction.add(container.id, cameraFragment, "camera_fragment")
                transaction.commitNow()
                fragmentCreated = true
            } catch (e: Exception) {
                Log.w(TAG, "Fragment transaction failed, using fallback", e)

                // Fallback: manually create fragment view
                val fragmentView = cameraFragment.onCreateView(
                    activity.layoutInflater,
                    container,
                    null
                )

                if (fragmentView != null) {
                    container.addView(fragmentView)
                    cameraFragment.onViewCreated(fragmentView, null)
                    cameraFragment.onResume()
                    fragmentCreated = true
                } else {
                    Log.e(TAG, "Failed to create fragment view")
                    onError(IllegalStateException("Failed to create camera fragment"))
                }
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error creating fragment", e)
            onError(e)
        }
    }

    override fun onDropViewInstance(view: FrameLayout) {
        super.onDropViewInstance(view)
        destroyFragment()
    }

    private fun destroyFragment() {
        try {
            val activity = reactContext.currentActivity
            if (activity is FragmentActivity) {
                val fragmentManager = activity.supportFragmentManager
                val fragment = fragmentManager.findFragmentByTag("camera_fragment")

                if (fragment != null) {
                    val transaction = fragmentManager.beginTransaction()
                    transaction.remove(fragment)
                    transaction.commitNow()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error destroying fragment", e)
        }

        fragmentCreated = false
    }

    /**
     * Setup layout management for the view
     */
    private fun setupLayout(view: View) {
        Choreographer.getInstance().postFrameCallback(object : Choreographer.FrameCallback {
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
        try {
            val width = propWidth ?: 0
            val height = propHeight ?: 0

            if (width > 0 && height > 0) {
                view.measure(
                    View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY),
                    View.MeasureSpec.makeMeasureSpec(height, View.MeasureSpec.EXACTLY)
                )
                view.layout(0, 0, width, height)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error laying out children", e)
        }
    }

    override fun onPassportRead(mrzInfo: MRZInfo) {
        val eventData = Arguments.createMap()
        val dataMap = Arguments.createMap()
        dataMap.putString("documentNumber", mrzInfo.documentNumber)
        dataMap.putString("expiryDate", mrzInfo.dateOfExpiry)
        dataMap.putString("birthDate", mrzInfo.dateOfBirth)
        dataMap.putString("documentType", mrzInfo.documentCode)
        dataMap.putString("countryCode", mrzInfo.nationality)
        eventData.putMap("data", dataMap)

        val eventEmitter = reactContext.getJSModule(RCTEventEmitter::class.java)
        eventEmitter.receiveEvent(
            -1,
            "onPassportRead",
            eventData
        )
    }

    override fun onError(e: Exception) {
        Log.e(TAG, "Camera error", e)

        val eventData = Arguments.createMap()
        eventData.putString("error", e.javaClass.simpleName)
        eventData.putString("errorMessage", e.message ?: "Unknown error")
        eventData.putString("stackTrace", e.stackTraceToString())

        val eventEmitter = reactContext.getJSModule(RCTEventEmitter::class.java)
        eventEmitter.receiveEvent(
            -1,
            "onError",
            eventData
        )
    }
}
