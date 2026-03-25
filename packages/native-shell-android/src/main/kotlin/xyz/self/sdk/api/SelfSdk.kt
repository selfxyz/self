// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.api

import android.app.Activity
import android.content.Intent
import xyz.self.sdk.webview.SelfVerificationActivity

object SelfSdk {
    fun launch(activity: Activity, config: SelfSdkConfig, requestCode: Int = REQUEST_CODE_VERIFICATION) {
        val intent = Intent(activity, SelfVerificationActivity::class.java).apply {
            putExtra(SelfVerificationActivity.EXTRA_TEE_URL, config.teeUrl)
            putExtra(SelfVerificationActivity.EXTRA_VERIFICATION_ID, config.verificationId)
            putExtra(SelfVerificationActivity.EXTRA_USER_ID, config.userId)
            putExtra(SelfVerificationActivity.EXTRA_DEBUG_MODE, config.isDebugMode)
        }
        activity.startActivityForResult(intent, requestCode)
    }

    fun handleResult(
        requestCode: Int,
        resultCode: Int,
        data: Intent?,
        callback: SelfSdkCallback,
        expectedRequestCode: Int = REQUEST_CODE_VERIFICATION,
    ) {
        if (requestCode != expectedRequestCode) return

        when (resultCode) {
            Activity.RESULT_OK -> {
                val resultData = data?.getStringExtra(SelfVerificationActivity.EXTRA_RESULT_DATA) ?: "{}"
                callback.onSuccess(resultData)
            }
            Activity.RESULT_CANCELED -> {
                callback.onCancelled()
            }
            Activity.RESULT_FIRST_USER -> {
                val resultData = data?.getStringExtra(SelfVerificationActivity.EXTRA_RESULT_DATA)
                callback.onFailure(SelfSdkException(resultData ?: "Verification failed"))
            }
            else -> {
                callback.onFailure(SelfSdkException("Verification failed with result code: $resultCode"))
            }
        }
    }

    const val REQUEST_CODE_VERIFICATION = 9001
}
