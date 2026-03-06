// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.testapp

import androidx.compose.runtime.Composable
import androidx.navigation.NavController
import xyz.self.testapp.viewmodels.VerificationViewModel

/**
 * Android implementation: Forward to the actual screen implementation
 */
@Composable
actual fun MrzScanScreen(
    navController: NavController,
    viewModel: VerificationViewModel,
) {
    xyz.self.testapp.screens
        .MrzScanScreen(navController, viewModel)
}

/**
 * Android implementation: Use the shared commonMain implementation
 */
@Composable
actual fun MrzConfirmationScreen(
    navController: NavController,
    viewModel: VerificationViewModel,
) {
    xyz.self.testapp.screens
        .MrzConfirmationScreen(navController, viewModel)
}

/**
 * Android implementation: Forward to the actual screen implementation
 */
@Composable
actual fun NfcScanScreen(
    navController: NavController,
    viewModel: VerificationViewModel,
) {
    xyz.self.testapp.screens
        .NfcScanScreen(navController, viewModel)
}
