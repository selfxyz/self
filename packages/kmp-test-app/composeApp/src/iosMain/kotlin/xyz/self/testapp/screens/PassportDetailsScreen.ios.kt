package xyz.self.testapp.screens

import androidx.compose.runtime.Composable
import xyz.self.testapp.models.PassportData
import xyz.self.testapp.viewmodels.VerificationViewModel

/**
 * iOS implementation: Load saved passport data effect (not implemented)
 */
@Composable
actual fun LoadSavedDataEffect(viewModel: VerificationViewModel) {
    // iOS not implemented
}

/**
 * iOS implementation: Get save passport data function (not implemented)
 */
@Composable
actual fun getSavePassportDataFunction(): ((PassportData) -> Unit)? {
    // iOS not implemented
    return null
}
