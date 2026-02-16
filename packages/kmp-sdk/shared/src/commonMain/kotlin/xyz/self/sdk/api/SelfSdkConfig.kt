// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.api

import kotlinx.serialization.Serializable

@Serializable
data class SelfSdkConfig(
    val endpoint: String = "https://api.self.xyz",
    val debug: Boolean = false,
)
