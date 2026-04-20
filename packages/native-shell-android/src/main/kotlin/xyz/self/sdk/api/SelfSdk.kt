// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.api

import android.app.Activity
import android.content.Intent
import xyz.self.sdk.webview.SelfVerificationActivity

object SelfSdk {
    internal var secureStorageProvider: SecureStorageProvider? = null
        private set

    fun launch(
        activity: Activity,
        launchConfig: SelfSdkLaunchConfig,
        requestCode: Int = REQUEST_CODE_VERIFICATION,
    ) {
        secureStorageProvider = launchConfig.secureStorageProvider
        val config = launchConfig.config
        val intent =
            Intent(activity, SelfVerificationActivity::class.java).apply {
                putExtra(SelfVerificationActivity.EXTRA_ENVIRONMENT, config.environment)
                putExtra(SelfVerificationActivity.EXTRA_VERIFICATION_ID, config.verificationId)
                putExtra(SelfVerificationActivity.EXTRA_USER_ID, config.userId)
                putExtra(SelfVerificationActivity.EXTRA_DEBUG_MODE, config.isDebugMode)
                putExtra(SelfVerificationActivity.EXTRA_VERSION, config.version)
                config.scope?.let { putExtra(SelfVerificationActivity.EXTRA_SCOPE, it) }
                config.disclosures?.let { putStringArrayListExtra(SelfVerificationActivity.EXTRA_DISCLOSURES, ArrayList(it)) }
                config.appName?.let { putExtra(SelfVerificationActivity.EXTRA_APP_NAME, it) }
                config.appEndpoint?.let { putExtra(SelfVerificationActivity.EXTRA_APP_ENDPOINT, it) }
                config.resultType?.let { putExtra(SelfVerificationActivity.EXTRA_RESULT_TYPE, it) }
                config.excludedCountries?.let { putStringArrayListExtra(SelfVerificationActivity.EXTRA_EXCLUDED_COUNTRIES, ArrayList(it)) }
                config.endpointType?.let { putExtra(SelfVerificationActivity.EXTRA_ENDPOINT_TYPE, it) }
                config.userIdType?.let { putExtra(SelfVerificationActivity.EXTRA_USER_ID_TYPE, it) }
                config.chainID?.let { putExtra(SelfVerificationActivity.EXTRA_CHAIN_ID, it) }
                config.userDefinedData?.let { putExtra(SelfVerificationActivity.EXTRA_USER_DEFINED_DATA, it) }
                config.selfDefinedData?.let { putExtra(SelfVerificationActivity.EXTRA_SELF_DEFINED_DATA, it) }
                putExtra(SelfVerificationActivity.EXTRA_REMOTE_WEB_APP_BASE_URL, config.remoteWebAppBaseUrl)
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
