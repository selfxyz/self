// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.api

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class SelfEnvironment {
    @SerialName("prod")
    PROD,

    @SerialName("stg")
    STG,
    ;

    val queryValue: String
        get() =
            when (this) {
                PROD -> "prod"
                STG -> "stg"
            }
}

@Serializable
data class SelfSdkConfig(
    val endpoint: String = SdkConstants.DEFAULT_ENDPOINT,
    val environment: SelfEnvironment = SelfEnvironment.PROD,
    val debug: Boolean = false,
    val version: Int = 1,
    val appName: String? = null,
    val appEndpoint: String? = null,
    val endpointType: String? = null,
    val chainID: Int? = null,
    val remoteWebAppBaseUrl: String = SdkConstants.DEFAULT_REMOTE_WEB_APP_BASE_URL,
    val devServerUrl: String? = null,
)
