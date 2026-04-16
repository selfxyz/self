// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.testapp.screens

import xyz.self.testapp.BuildConfig

actual fun getDevServerUrl(): String? = BuildConfig.WEBVIEW_DEV_URL.ifBlank { null }
