// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.minipay

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import xyz.self.minipay.screens.HomeScreen
import xyz.self.minipay.screens.ResultScreen
import xyz.self.minipay.theme.MiniPayTheme
import xyz.self.sdk.api.SelfSdk

@Composable
fun App(sdk: SelfSdk? = null) {
    MiniPayTheme {
        val navController = rememberNavController()
        val viewModel = remember {
            if (sdk != null) MainViewModel(sdk) else MainViewModel()
        }

        NavHost(
            navController = navController,
            startDestination = "home",
        ) {
            composable("home") {
                HomeScreen(
                    viewModel = viewModel,
                    onVerify = { viewModel.launchVerification() },
                    onNavigateToResult = { navController.navigate("result") },
                )
            }

            composable("result") {
                ResultScreen(
                    viewModel = viewModel,
                    onDone = {
                        viewModel.returnToHome()
                        navController.popBackStack("home", inclusive = false)
                    },
                    onRetry = {
                        navController.popBackStack("home", inclusive = false)
                        viewModel.launchVerification()
                    },
                )
            }
        }
    }
}
