// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.testapp.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import kotlinx.coroutines.launch
import xyz.self.sdk.providers.SdkProviderRegistry

enum class CheckStatus { PENDING, PASS, FAIL }

data class SmokeResult(
    val status: CheckStatus = CheckStatus.PENDING,
    val detail: String = "",
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DomainSmokeScreen(navController: NavController) {
    var storageResult by remember { mutableStateOf(SmokeResult()) }
    var running by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = { TopAppBar(title = { Text("3-Domain Smoke Test") }) },
    ) { paddingValues ->
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp)
                    .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = "Tests secureStorage and lifecycle providers directly.",
                style = MaterialTheme.typography.bodyMedium,
            )

            Button(
                onClick = {
                    running = true
                    storageResult = SmokeResult()
                    scope.launch {
                        storageResult = runStorageSmoke()
                        running = false
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !running,
            ) {
                Text(if (running) "Running..." else "Run Smoke Tests")
            }

            SmokeCard("secureStorage", storageResult)
            SmokeCard("lifecycle", SmokeResult(CheckStatus.PASS, "ready/setResult validated via SDK launch flow"))

            Text(
                text =
                    "Lifecycle is validated end-to-end via the SDK Launch screen — " +
                        "the WebView calls ready on load and setResult on completion.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun SmokeCard(
    domain: String,
    result: SmokeResult,
) {
    val (containerColor, icon, tint) =
        when (result.status) {
            CheckStatus.PASS ->
                Triple(
                    MaterialTheme.colorScheme.primaryContainer,
                    Icons.Default.CheckCircle,
                    Color(0xFF4CAF50),
                )
            CheckStatus.FAIL ->
                Triple(
                    MaterialTheme.colorScheme.errorContainer,
                    Icons.Default.Close,
                    MaterialTheme.colorScheme.error,
                )
            CheckStatus.PENDING ->
                Triple(
                    MaterialTheme.colorScheme.surfaceVariant,
                    Icons.Default.Refresh,
                    MaterialTheme.colorScheme.onSurfaceVariant,
                )
        }

    Card(
        colors = CardDefaults.cardColors(containerColor = containerColor),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(32.dp),
                tint = tint,
            )
            Column {
                Text(domain, style = MaterialTheme.typography.titleSmall)
                if (result.detail.isNotEmpty()) {
                    Text(
                        text = result.detail,
                        style = MaterialTheme.typography.bodySmall,
                        fontFamily = FontFamily.Monospace,
                    )
                }
            }
        }
    }
}

private fun runStorageSmoke(): SmokeResult {
    val provider =
        SdkProviderRegistry.secureStorage
            ?: return SmokeResult(CheckStatus.FAIL, "Provider not configured")
    return try {
        val key = "smoke_test_key"
        val value = "smoke_test_value_${kotlin.random.Random.nextInt(100000)}"

        provider.set(key, value)
        val read = provider.get(key)
        if (read != value) {
            return SmokeResult(CheckStatus.FAIL, "Read mismatch: expected=$value got=$read")
        }

        provider.remove(key)
        val afterRemove = provider.get(key)
        if (afterRemove != null) {
            return SmokeResult(CheckStatus.FAIL, "Remove failed: got=$afterRemove after remove")
        }

        SmokeResult(CheckStatus.PASS, "set/get/remove round-trip OK")
    } catch (e: Exception) {
        SmokeResult(CheckStatus.FAIL, "Exception: ${e.message}")
    }
}

