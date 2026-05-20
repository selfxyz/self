// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

package com.proofofpassportapp

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.proofofpassportapp.ui.SelfMRZScannerActivity

class SelfMRZScannerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val REQUEST_CODE_MRZ_SCAN = 0x1A1A
        const val NAME = "SelfMRZScannerModule"
    }

    private var pendingPromise: Promise? = null

    private val activityEventListener = object : BaseActivityEventListener() {
        override fun onActivityResult(
            activity: Activity,
            requestCode: Int,
            resultCode: Int,
            data: Intent?,
        ) {
            if (requestCode != REQUEST_CODE_MRZ_SCAN) return
            val promise = pendingPromise ?: return
            pendingPromise = null

            when (resultCode) {
                Activity.RESULT_OK -> {
                    val map = Arguments.createMap()
                    map.putString(
                        "documentNumber",
                        data?.getStringExtra(SelfMRZScannerActivity.EXTRA_DOCUMENT_NUMBER) ?: "",
                    )
                    map.putString(
                        "dateOfBirth",
                        data?.getStringExtra(SelfMRZScannerActivity.EXTRA_DATE_OF_BIRTH) ?: "",
                    )
                    map.putString(
                        "dateOfExpiry",
                        data?.getStringExtra(SelfMRZScannerActivity.EXTRA_DATE_OF_EXPIRY) ?: "",
                    )
                    map.putString(
                        "documentType",
                        data?.getStringExtra(SelfMRZScannerActivity.EXTRA_DOCUMENT_TYPE) ?: "",
                    )
                    map.putString(
                        "countryCode",
                        data?.getStringExtra(SelfMRZScannerActivity.EXTRA_COUNTRY_CODE) ?: "",
                    )
                    promise.resolve(map)
                }
                SelfMRZScannerActivity.RESULT_ERROR -> {
                    val msg = data?.getStringExtra(SelfMRZScannerActivity.EXTRA_ERROR_MESSAGE)
                        ?: "MRZ scan failed"
                    promise.reject("MRZ_SCAN_FAILED", msg)
                }
                Activity.RESULT_CANCELED ->
                    promise.reject("MRZ_SCAN_CANCELLED", "MRZ scan cancelled")
                else ->
                    promise.reject(
                        "MRZ_SCAN_FAILED",
                        "Unknown result code: $resultCode",
                    )
            }
        }
    }

    init {
        reactContext.addActivityEventListener(activityEventListener)
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun startScanning(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject(
                "CAMERA_INIT_FAILED",
                "No current activity to host the MRZ scanner",
            )
            return
        }
        if (pendingPromise != null) {
            promise.reject("MRZ_SCAN_FAILED", "An MRZ scan is already in progress")
            return
        }
        pendingPromise = promise

        val intent = Intent(activity, SelfMRZScannerActivity::class.java)
        activity.startActivityForResult(intent, REQUEST_CODE_MRZ_SCAN)
    }
}
