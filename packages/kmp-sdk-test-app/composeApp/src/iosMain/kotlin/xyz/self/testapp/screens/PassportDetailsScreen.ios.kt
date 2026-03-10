// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.testapp.screens

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import platform.Foundation.NSUserDefaults
import xyz.self.testapp.models.PassportData
import xyz.self.testapp.utils.Logger
import xyz.self.testapp.viewmodels.VerificationViewModel

private const val PASSPORT_DATA_KEY = "xyz.self.testapp.passportData"

/**
 * iOS implementation: Load saved passport data from NSUserDefaults
 */
@OptIn(ExperimentalForeignApi::class)
@Composable
actual fun LoadSavedDataEffect(viewModel: VerificationViewModel) {
    LaunchedEffect(Unit) {
        try {
            val defaults = NSUserDefaults.standardUserDefaults
            val savedJson = defaults.stringForKey(PASSPORT_DATA_KEY)

            if (savedJson != null) {
                val passportData = Json.decodeFromString<PassportData>(savedJson)
                viewModel.loadSavedData(passportData)
            }
        } catch (e: Exception) {
            Logger.e("PassportDetails", "Failed to load saved passport data: ${e.message}")
        }
    }
}

/**
 * iOS implementation: Save passport data to NSUserDefaults
 */
@OptIn(ExperimentalForeignApi::class)
@Composable
actual fun getSavePassportDataFunction(): ((PassportData) -> Unit)? =
    { passportData ->
        try {
            val defaults = NSUserDefaults.standardUserDefaults
            val jsonString = Json.encodeToString(passportData)
            defaults.setObject(jsonString, PASSPORT_DATA_KEY)
            defaults.synchronize()
        } catch (e: Exception) {
            Logger.e("PassportDetails", "Failed to save passport data: ${e.message}")
        }
    }
