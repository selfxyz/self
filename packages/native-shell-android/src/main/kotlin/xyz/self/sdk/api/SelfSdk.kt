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

    fun handleResult(requestCode: Int, resultCode: Int, data: Intent?, callback: SelfSdkCallback) {
        if (requestCode != REQUEST_CODE_VERIFICATION) return

        when (resultCode) {
            Activity.RESULT_OK -> {
                val resultData = data?.getStringExtra(SelfVerificationActivity.EXTRA_RESULT_DATA)
                callback.onSuccess(mapOf("data" to resultData))
            }
            Activity.RESULT_CANCELED -> {
                callback.onCancelled()
            }
            else -> {
                callback.onFailure(Exception("Verification failed"))
            }
        }
    }

    const val REQUEST_CODE_VERIFICATION = 9001
}
