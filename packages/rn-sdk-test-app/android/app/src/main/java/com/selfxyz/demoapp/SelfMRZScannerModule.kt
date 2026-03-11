// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package com.selfxyz.demoapp

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments

class SelfMRZScannerModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    private var scanPromise: Promise? = null

    private val activityEventListener: ActivityEventListener =
        object : BaseActivityEventListener() {
            override fun onActivityResult(
                activity: Activity,
                requestCode: Int,
                resultCode: Int,
                data: Intent?,
            ) {
                if (requestCode != REQUEST_SCAN_MRZ) {
                    return
                }

                val promise = scanPromise
                scanPromise = null

                if (promise == null) {
                    return
                }

                if (resultCode != Activity.RESULT_OK || data == null) {
                    val errorCode = data?.getStringExtra(SelfMrzScannerActivity.EXTRA_ERROR_CODE)
                    if (errorCode != null) {
                        promise.reject(errorCode, "MRZ scanning failed: $errorCode")
                    } else {
                        promise.reject("MRZ_SCAN_CANCELLED", "MRZ scanning cancelled")
                    }
                    return
                }

                val documentNumber = data.getStringExtra(SelfMrzScannerActivity.EXTRA_DOCUMENT_NUMBER)
                val dateOfBirth = data.getStringExtra(SelfMrzScannerActivity.EXTRA_DATE_OF_BIRTH)
                val dateOfExpiry = data.getStringExtra(SelfMrzScannerActivity.EXTRA_DATE_OF_EXPIRY)

                if (documentNumber.isNullOrBlank() || dateOfBirth.isNullOrBlank() || dateOfExpiry.isNullOrBlank()) {
                    promise.reject("MRZ_SCAN_INVALID_RESULT", "MRZ scan returned incomplete data")
                    return
                }

                val result: WritableMap = Arguments.createMap().apply {
                    putString("documentNumber", documentNumber)
                    putString("dateOfBirth", dateOfBirth)
                    putString("dateOfExpiry", dateOfExpiry)
                }
                promise.resolve(result)
            }
        }

    init {
        reactApplicationContext.addActivityEventListener(activityEventListener)
    }

    override fun getName(): String = "SelfMRZScannerModule"

    @ReactMethod
    fun startScanning(promise: Promise) {
        if (scanPromise != null) {
            promise.reject("MRZ_SCAN_IN_PROGRESS", "MRZ scanning already in progress")
            return
        }

        val currentActivity = currentActivity
        if (currentActivity == null) {
            promise.reject("ACTIVITY_DOES_NOT_EXIST", "Activity doesn't exist")
            return
        }

        scanPromise = promise

        try {
            val intent = Intent(currentActivity, SelfMrzScannerActivity::class.java)
            currentActivity.startActivityForResult(intent, REQUEST_SCAN_MRZ)
        } catch (error: Exception) {
            scanPromise = null
            promise.reject("MRZ_SCAN_FAILED", "Failed to launch MRZ scanner", error)
        }
    }

    companion object {
        private const val REQUEST_SCAN_MRZ = 8811
    }
}
