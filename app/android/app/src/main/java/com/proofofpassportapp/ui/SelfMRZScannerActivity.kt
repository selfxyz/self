// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

package com.proofofpassportapp.ui

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.fragment.app.FragmentActivity
import org.jmrtd.lds.icao.MRZInfo

class SelfMRZScannerActivity : FragmentActivity(),
    CameraMLKitFragment.CameraMLKitCallback {

    companion object {
        const val EXTRA_DOCUMENT_NUMBER = "documentNumber"
        const val EXTRA_DATE_OF_BIRTH = "dateOfBirth"
        const val EXTRA_DATE_OF_EXPIRY = "dateOfExpiry"
        const val EXTRA_DOCUMENT_TYPE = "documentType"
        const val EXTRA_COUNTRY_CODE = "countryCode"
        const val EXTRA_ERROR_MESSAGE = "errorMessage"
        const val RESULT_ERROR = 2
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val container = FrameLayout(this).apply {
            id = View.generateViewId()
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            )
        }
        setContentView(container)

        if (savedInstanceState == null) {
            val fragment = CameraMLKitFragment(this)
            supportFragmentManager
                .beginTransaction()
                .replace(container.id, fragment)
                .commit()
        }
    }

    override fun onPassportRead(mrzInfo: MRZInfo) {
        val data = Intent().apply {
            putExtra(EXTRA_DOCUMENT_NUMBER, mrzInfo.documentNumber ?: "")
            putExtra(EXTRA_DATE_OF_BIRTH, mrzInfo.dateOfBirth ?: "")
            putExtra(EXTRA_DATE_OF_EXPIRY, mrzInfo.dateOfExpiry ?: "")
            putExtra(EXTRA_DOCUMENT_TYPE, mrzInfo.documentType ?: "")
            putExtra(EXTRA_COUNTRY_CODE, mrzInfo.nationality ?: "")
        }
        setResult(Activity.RESULT_OK, data)
        finish()
    }

    override fun onError(e: Exception) {
        val data = Intent().apply {
            putExtra(EXTRA_ERROR_MESSAGE, e.message ?: "MRZ scan failed")
        }
        setResult(RESULT_ERROR, data)
        finish()
    }
}
