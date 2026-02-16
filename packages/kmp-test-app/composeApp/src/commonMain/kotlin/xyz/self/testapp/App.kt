// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.testapp

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import xyz.self.testapp.screens.PassportDetailsScreen
import xyz.self.testapp.screens.ResultScreen
import xyz.self.testapp.theme.SelfTestTheme
import xyz.self.testapp.viewmodels.VerificationViewModel

@Composable
fun App() {
    SelfTestTheme {
        val navController = rememberNavController()
        val viewModel = remember { VerificationViewModel() }

        NavHost(
            navController = navController,
            startDestination = "passport_details",
        ) {
            composable("passport_details") {
                PassportDetailsScreen(navController, viewModel)
            }

            composable("mrz_scan") {
                MrzScanScreen(navController, viewModel)
            }

            composable("mrz_confirmation") {
                MrzConfirmationScreen(navController, viewModel)
            }

            composable("nfc_scan") {
                NfcScanScreen(navController, viewModel)
            }

            composable("result") {
                ResultScreen(navController, viewModel)
            }
        }
    }
}

/**
 * Platform-specific MRZ scan screen
 */
@Composable
expect fun MrzScanScreen(
    navController: androidx.navigation.NavController,
    viewModel: VerificationViewModel,
)

/**
 * Platform-specific MRZ confirmation screen
 */
@Composable
expect fun MrzConfirmationScreen(
    navController: androidx.navigation.NavController,
    viewModel: VerificationViewModel,
)

/**
 * Platform-specific NFC scan screen
 */
@Composable
expect fun NfcScanScreen(
    navController: androidx.navigation.NavController,
    viewModel: VerificationViewModel,
)
