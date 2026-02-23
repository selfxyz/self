// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.minipay.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import xyz.self.minipay.MainViewModel

@Composable
fun ResultScreen(
    viewModel: MainViewModel,
    onDone: () -> Unit,
    onRetry: () -> Unit,
) {
    val result = viewModel.verificationResult
    val error = viewModel.verificationError

    Scaffold { innerPadding ->
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            if (result != null && result.success) {
                // Success state
                Text(
                    text = "Verified",
                    style = MaterialTheme.typography.headlineLarge,
                    color = MaterialTheme.colorScheme.primary,
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Display disclosed claims
                result.claims?.forEach { (key, value) ->
                    Text(
                        text = "$key: $value",
                        style = MaterialTheme.typography.bodyLarge,
                        modifier = Modifier.padding(vertical = 4.dp),
                    )
                }

                Spacer(modifier = Modifier.height(48.dp))

                Button(
                    onClick = onDone,
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                    shape = RoundedCornerShape(12.dp),
                ) {
                    Text("Done", style = MaterialTheme.typography.titleMedium)
                }
            } else if (error != null) {
                // Error state
                Text(
                    text = "Error",
                    style = MaterialTheme.typography.headlineLarge,
                    color = MaterialTheme.colorScheme.error,
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = userFriendlyMessage(error.code, error.message),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                Spacer(modifier = Modifier.height(48.dp))

                Button(
                    onClick = onRetry,
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                    shape = RoundedCornerShape(12.dp),
                ) {
                    Text("Try Again", style = MaterialTheme.typography.titleMedium)
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedButton(
                    onClick = onDone,
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors =
                        ButtonDefaults.outlinedButtonColors(
                            contentColor = MaterialTheme.colorScheme.onSurface,
                        ),
                ) {
                    Text("Cancel", style = MaterialTheme.typography.titleMedium)
                }
            }
        }
    }
}

/**
 * Maps SDK error codes to user-friendly messages.
 */
private fun userFriendlyMessage(
    code: String,
    fallback: String,
): String =
    when (code) {
        "NFC_SCAN_FAILED" -> "NFC scan failed. Please try holding your phone to the passport again."
        "NFC_NOT_AVAILABLE" -> "NFC is not available on this device."
        "PASSPORT_NOT_SUPPORTED" -> "This passport type is not supported for verification."
        "BIOMETRIC_FAILED" -> "Biometric authentication failed. Please try again."
        "NETWORK_ERROR" -> "Network error. Please check your connection and try again."
        "PARSE_ERROR" -> "An unexpected error occurred processing the result."
        "NO_VIEW_CONTROLLER" -> "Could not present the verification screen."
        "NOT_CONFIGURED" -> "SDK not configured. Please restart the app."
        else -> fallback
    }
