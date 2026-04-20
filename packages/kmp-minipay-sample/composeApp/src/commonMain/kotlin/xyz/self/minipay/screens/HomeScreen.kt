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
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import xyz.self.minipay.MainViewModel
import xyz.self.minipay.Screen

@Composable
fun HomeScreen(
    viewModel: MainViewModel,
    onVerify: () -> Unit,
    onNavigateToResult: () -> Unit,
    onOpenWebViewBridge: () -> Unit,
) {
    // Navigate to result when screen changes
    LaunchedEffect(viewModel.currentScreen) {
        if (viewModel.currentScreen is Screen.Result) {
            onNavigateToResult()
        }
    }

    Scaffold { innerPadding ->
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(24.dp),
        ) {
            Spacer(modifier = Modifier.height(48.dp))

            Text(
                text = "MiniPay",
                style = MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.primary,
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Status card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors =
                    CardDefaults.cardColors(
                        containerColor =
                            if (viewModel.homeState.isVerified) {
                                MaterialTheme.colorScheme.primaryContainer
                            } else {
                                MaterialTheme.colorScheme.surfaceVariant
                            },
                    ),
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                ) {
                    Text(
                        text = "Status",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = if (viewModel.homeState.isVerified) "Verified" else "Unverified",
                        style = MaterialTheme.typography.headlineSmall,
                    )

                    // Show verified claims if available
                    viewModel.homeState.verifiedClaims?.forEach { (key, value) ->
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "$key: $value",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }

                    viewModel.homeState.lastProofDate?.let { date ->
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Last verified: $date",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            Button(
                onClick = onVerify,
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                shape = RoundedCornerShape(12.dp),
                enabled = !viewModel.isLaunching,
            ) {
                Text(
                    text = if (viewModel.isLaunching) "Launching..." else "Verify Identity",
                    style = MaterialTheme.typography.titleMedium,
                )
            }

            Button(
                onClick = onOpenWebViewBridge,
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                shape = RoundedCornerShape(12.dp),
            ) {
                Text(
                    text = "Open WebView Bridge PoC",
                    style = MaterialTheme.typography.titleMedium,
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
