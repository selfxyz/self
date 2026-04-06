// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.testapp

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import xyz.self.testapp.screens.DomainSmokeScreen
import xyz.self.testapp.screens.SdkLaunchScreen
import xyz.self.testapp.theme.SelfTestTheme

@Composable
fun App() {
    SelfTestTheme {
        val navController = rememberNavController()

        NavHost(
            navController = navController,
            startDestination = "sdk_launch",
        ) {
            composable("sdk_launch") {
                SdkLaunchScreen(navController)
            }

            composable("domain_smoke") {
                DomainSmokeScreen(navController)
            }
        }
    }
}
