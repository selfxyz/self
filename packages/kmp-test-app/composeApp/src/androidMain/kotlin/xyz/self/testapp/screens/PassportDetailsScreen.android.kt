package xyz.self.testapp.screens

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.platform.LocalContext
import xyz.self.testapp.models.PassportData
import xyz.self.testapp.storage.PassportDataStore
import xyz.self.testapp.viewmodels.VerificationViewModel

/**
 * Android implementation: Load saved passport data effect
 */
@Composable
actual fun LoadSavedDataEffect(viewModel: VerificationViewModel) {
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        try {
            val dataStore = PassportDataStore(context)
            val savedData = dataStore.getPassportData()
            if (savedData != null) {
                viewModel.loadSavedData(savedData)
            }
        } catch (e: Exception) {
            // Silently fail if unable to load saved data
            viewModel.addLog("Could not load saved passport data: ${e.message}")
        }
    }
}

/**
 * Android implementation: Get save passport data function
 */
@Composable
actual fun getSavePassportDataFunction(): ((PassportData) -> Unit)? {
    val context = LocalContext.current
    return { passportData ->
        try {
            val dataStore = PassportDataStore(context)
            dataStore.savePassportData(passportData)
        } catch (e: Exception) {
            // Silently fail if unable to save
        }
    }
}
