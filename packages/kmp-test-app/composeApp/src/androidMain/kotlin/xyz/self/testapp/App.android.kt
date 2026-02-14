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
