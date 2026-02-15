package xyz.self.testapp.screens

import android.app.Activity
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import xyz.self.sdk.bridge.MessageRouter
import xyz.self.sdk.handlers.NfcBridgeHandler
import xyz.self.sdk.models.NfcScanState
import xyz.self.testapp.components.NfcProgressIndicator
import xyz.self.testapp.models.VerificationFlowState
import xyz.self.testapp.viewmodels.VerificationViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NfcScanScreen(
    navController: NavController,
    viewModel: VerificationViewModel,
) {
    val context = LocalContext.current
    val activity = context as? Activity
    val scope = rememberCoroutineScope()
    val state by viewModel.state.collectAsStateWithLifecycle()

    val currentState = state as? VerificationFlowState.NfcScan
    val errorState = state as? VerificationFlowState.Error
    val passportData =
        currentState?.passportData
            ?: (errorState?.previousState as? VerificationFlowState.NfcScan)?.passportData

    var isScanning by remember { mutableStateOf(false) }
    var hasError by remember { mutableStateOf(false) }
    var scanState by remember { mutableStateOf<NfcScanState?>(null) }
    var progress by remember { mutableStateOf("Ready to scan") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("NFC Scan") },
            )
        },
    ) { paddingValues ->
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(24.dp),
        ) {
            Spacer(modifier = Modifier.weight(0.3f))

            // NFC Progress Indicator with state-based animations
            NfcProgressIndicator(
                scanState = if (isScanning) scanState else null,
            )

            // Additional progress details
            if (isScanning) {
                scanState?.let { state ->
                    Card(
                        colors =
                            CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.secondaryContainer,
                            ),
                    ) {
                        Text(
                            text = "Step ${state.ordinal + 1} of ${NfcScanState.entries.size}",
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(16.dp),
                        )
                    }
                }
            }

            // Instructions
            if (!isScanning) {
                Card {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Text(
                            text = "Instructions:",
                            style = MaterialTheme.typography.titleMedium,
                        )
                        Text(
                            text = "1. Keep your passport closed",
                            style = MaterialTheme.typography.bodySmall,
                        )
                        Text(
                            text = "2. Place phone on the back cover",
                            style = MaterialTheme.typography.bodySmall,
                        )
                        Text(
                            text = "3. Hold still for 10-15 seconds",
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // Start Scan Button
            Button(
                onClick = {
                    if (activity == null || passportData == null) {
                        viewModel.setError("Activity or passport data not available")
                        return@Button
                    }

                    isScanning = true
                    hasError = false
                    scanState = null
                    progress = "Initializing..."

                    // Ensure ViewModel state is NfcScan (not Error) so progress updates work
                    if (state !is VerificationFlowState.NfcScan) {
                        viewModel.skipMrzScan(passportData)
                    }
                    viewModel.updateNfcProgress("Starting NFC scan...")

                    val router =
                        MessageRouter(
                            sendToWebView = { js ->
                                // Log bridge events
                                val cleaned =
                                    js
                                        .removePrefix("window.SelfNativeBridge._handleEvent(")
                                        .removePrefix("window.SelfNativeBridge._handleResponse(")
                                        .removeSuffix(")")
                                        .removeSurrounding("'")
                                        .replace("\\'", "'")
                                        .replace("\\\\", "\\")
                                try {
                                    val element = Json.parseToJsonElement(cleaned)
                                    viewModel.addLog("Event: $cleaned")
                                } catch (_: Exception) {
                                }
                            },
                        )

                    val nfcHandler = NfcBridgeHandler(activity, router)
                    router.register(nfcHandler)

                    scope.launch {
                        try {
                            val params =
                                mapOf<String, JsonElement>(
                                    "passportNumber" to JsonPrimitive(passportData.passportNumber),
                                    "dateOfBirth" to JsonPrimitive(passportData.dateOfBirth),
                                    "dateOfExpiry" to JsonPrimitive(passportData.dateOfExpiry),
                                    "sessionId" to
                                        JsonPrimitive(
                                            java.util.UUID
                                                .randomUUID()
                                                .toString(),
                                        ),
                                )

                            val result =
                                nfcHandler.scanWithProgress(params) { state ->
                                    scanState = state
                                    progress = state.message
                                }

                            withContext(Dispatchers.Main) {
                                isScanning = false
                                progress = "Scan completed successfully"
                                viewModel.setNfcResult(result)
                                navController.navigate("result") {
                                    popUpTo("nfc_scan") { inclusive = true }
                                }
                            }
                        } catch (e: Exception) {
                            withContext(Dispatchers.Main) {
                                isScanning = false
                                hasError = true
                                scanState = null
                                progress = "Error: ${e.message}"
                                viewModel.setError("NFC scan failed: ${e.message}")
                            }
                        }
                    }
                },
                enabled = !isScanning && passportData != null,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    when {
                        isScanning -> "Scanning..."
                        hasError -> "Retry NFC Scan"
                        else -> "Start NFC Scan"
                    },
                )
            }

            // Skip button
            OutlinedButton(
                onClick = {
                    viewModel.setNfcResult(null)
                    navController.navigate("result")
                },
                enabled = !isScanning,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Skip and View Test Result")
            }
        }
    }
}
