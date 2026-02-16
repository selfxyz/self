// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.testapp.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import xyz.self.testapp.models.PassportData
import xyz.self.testapp.models.VerificationFlowState
import xyz.self.testapp.viewmodels.VerificationViewModel

/**
 * Platform-specific effect to load saved passport data
 */
@Composable
expect fun LoadSavedDataEffect(viewModel: VerificationViewModel)

/**
 * Platform-specific function to save passport data
 * Returns a function that saves the passport data
 */
@Composable
expect fun getSavePassportDataFunction(): ((PassportData) -> Unit)?

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PassportDetailsScreen(
    navController: NavController,
    viewModel: VerificationViewModel,
) {
    // Load saved data on first composition
    LoadSavedDataEffect(viewModel)

    val savePassportData = getSavePassportDataFunction()
    val focusManager = LocalFocusManager.current

    val state by viewModel.state.collectAsStateWithLifecycle()

    val passportData =
        when (state) {
            is VerificationFlowState.PassportDetails -> (state as VerificationFlowState.PassportDetails).passportData
            else -> PassportData()
        }

    var passportNumber by remember(passportData) { mutableStateOf(passportData.passportNumber) }
    var dateOfBirth by remember(passportData) { mutableStateOf(passportData.dateOfBirth) }
    var dateOfExpiry by remember(passportData) { mutableStateOf(passportData.dateOfExpiry) }

    val hasSavedData =
        state is VerificationFlowState.PassportDetails &&
            (state as VerificationFlowState.PassportDetails).hasSavedData

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Passport Details") },
            )
        },
    ) { paddingValues ->
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp)
                    .clickable(
                        indication = null,
                        interactionSource = remember { MutableInteractionSource() },
                    ) {
                        focusManager.clearFocus()
                    },
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            if (hasSavedData) {
                Card(
                    colors =
                        CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.primaryContainer,
                        ),
                ) {
                    Text(
                        text = "Saved passport data loaded. You can continue with this data or edit it.",
                        modifier = Modifier.padding(16.dp),
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }

            OutlinedTextField(
                value = passportNumber,
                onValueChange = { passportNumber = it.uppercase() },
                label = { Text("Passport Number") },
                placeholder = { Text("e.g., AB1234567") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                keyboardActions =
                    KeyboardActions(
                        onNext = { /* Focus moves automatically */ },
                    ),
            )

            OutlinedTextField(
                value = dateOfBirth,
                onValueChange = {
                    if (it.length <= 6 && it.all { char -> char.isDigit() }) {
                        dateOfBirth = it
                    }
                },
                label = { Text("Date of Birth") },
                placeholder = { Text("YYMMDD (e.g., 900115)") },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions =
                    KeyboardOptions(
                        keyboardType = KeyboardType.Number,
                        imeAction = ImeAction.Next,
                    ),
                keyboardActions =
                    KeyboardActions(
                        onNext = { /* Focus moves automatically */ },
                    ),
                singleLine = true,
                supportingText = { Text("Format: YYMMDD") },
            )

            OutlinedTextField(
                value = dateOfExpiry,
                onValueChange = {
                    if (it.length <= 6 && it.all { char -> char.isDigit() }) {
                        dateOfExpiry = it
                    }
                },
                label = { Text("Date of Expiry") },
                placeholder = { Text("YYMMDD (e.g., 300115)") },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions =
                    KeyboardOptions(
                        keyboardType = KeyboardType.Number,
                        imeAction = ImeAction.Done,
                    ),
                keyboardActions =
                    KeyboardActions(
                        onDone = { focusManager.clearFocus() },
                    ),
                singleLine = true,
                supportingText = { Text("Format: YYMMDD") },
            )

            Spacer(modifier = Modifier.weight(1f))

            val currentPassportData =
                PassportData(
                    passportNumber = passportNumber,
                    dateOfBirth = dateOfBirth,
                    dateOfExpiry = dateOfExpiry,
                )

            Button(
                onClick = {
                    // Save the passport data before proceeding
                    savePassportData?.invoke(currentPassportData)
                    viewModel.proceedToMrzScan(currentPassportData)
                    navController.navigate("mrz_scan")
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = currentPassportData.isValid(),
            ) {
                Text(if (hasSavedData) "Continue" else "Next: Scan MRZ")
            }

            if (!currentPassportData.isValid()) {
                Text(
                    text = "Please fill in all fields with valid dates (YYMMDD format)",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                )
            }
        }
    }
}
