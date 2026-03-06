// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.testapp

import androidx.compose.ui.window.ComposeUIViewController
import xyz.self.testapp.utils.Logger
import xyz.self.testapp.utils.setupGlobalExceptionHandler

private var isInitialized = false

fun MainViewController() =
    ComposeUIViewController {
        // Initialize exception handler once
        if (!isInitialized) {
            setupGlobalExceptionHandler()
            Logger.i("App", "iOS app initialized with exception handler")
            isInitialized = true
        }

        App()
    }
