// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.minipay

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import xyz.self.sdk.api.SelfSdk
import xyz.self.sdk.api.SelfSdkCallback
import xyz.self.sdk.api.SelfSdkConfig
import xyz.self.sdk.api.SelfSdkError
import xyz.self.sdk.api.VerificationRequest
import xyz.self.sdk.api.VerificationResult

private const val HOME_STATE_KEY = "home_state"

@Serializable
data class HomeState(
    val isVerified: Boolean = false,
    val lastProofDate: String? = null,
    val verifiedClaims: Map<String, String>? = null,
)

sealed class Screen {
    data object Home : Screen()
    data object Result : Screen()
}

class MainViewModel(
    private val sdk: SelfSdk = SelfSdk.configure(SelfSdkConfig(debug = false)),
) {
    private fun stringifyClaims(claims: Map<String, Any?>?): Map<String, String>? =
        claims?.mapValues { (_, value) -> value?.toString() ?: "null" }

    var currentScreen by mutableStateOf<Screen>(Screen.Home)
        private set

    var verificationResult: VerificationResult? by mutableStateOf(null)
        private set

    var verificationError: SelfSdkError? by mutableStateOf(null)
        private set

    var homeState by mutableStateOf(HomeState())
        private set

    var isLaunching by mutableStateOf(false)
        private set

    init {
        val stored = AppStorage.load(HOME_STATE_KEY)
        if (stored != null) {
            try {
                homeState = Json.decodeFromString<HomeState>(stored)
            } catch (_: Exception) {
                AppStorage.clear(HOME_STATE_KEY)
            }
        }
    }

    private val sdkCallback =
        object : SelfSdkCallback {
            override fun onSuccess(result: VerificationResult) {
                verificationResult = result
                verificationError = null
                currentScreen = Screen.Result
                isLaunching = false

                // Update homeState eagerly so system back shows correct state
                val newState = HomeState(
                    isVerified = true,
                    lastProofDate = result.verificationId,
                    verifiedClaims = stringifyClaims(result.claims),
                )
                homeState = newState
                AppStorage.save(HOME_STATE_KEY, Json.encodeToString(newState))
            }

            override fun onFailure(error: SelfSdkError) {
                verificationResult = null
                verificationError = error
                currentScreen = Screen.Result
                isLaunching = false
            }

            override fun onCancelled() {
                // Stay on home screen
                isLaunching = false
            }
        }

    fun launchVerification(platformContext: Any? = null) {
        isLaunching = true
        platformLaunch(
            sdk = sdk,
            request = VerificationRequest(
                userId = "minipay-user",
                disclosures = listOf("nationality", "date_of_birth"),
            ),
            callback = sdkCallback,
            platformContext = platformContext,
        )
    }

    fun returnToHome() {
        // Update home state if verification was successful
        val result = verificationResult
        if (result != null && result.success) {
            homeState =
                HomeState(
                    isVerified = true,
                    lastProofDate = result.verificationId,
                    verifiedClaims = stringifyClaims(result.claims),
                )
            AppStorage.save(HOME_STATE_KEY, Json.encodeToString(homeState))
        }

        // Clear transient state
        verificationResult = null
        verificationError = null
        currentScreen = Screen.Home
    }
}
