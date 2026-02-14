package xyz.self.testapp.screens

import android.app.Activity
import androidx.compose.animation.core.*
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
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
    val passportData = currentState?.passportData

    var isScanning by remember { mutableStateOf(false) }
    var progress by remember { mutableStateOf("Ready to scan") }

    val infiniteTransition = rememberInfiniteTransition()
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec =
            infiniteRepeatable(
                animation = tween(2000, easing = LinearEasing),
                repeatMode = RepeatMode.Restart,
            ),
    )

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

            // NFC Icon with animation
            Icon(
                imageVector = Icons.Default.Nfc,
                contentDescription = "NFC",
                modifier =
                    Modifier
                        .size(120.dp)
                        .rotate(if (isScanning) rotation else 0f),
                tint =
                    if (isScanning) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    },
            )

            // Status text
            Text(
                text = if (isScanning) "Scanning..." else "Ready to Scan",
                style = MaterialTheme.typography.headlineSmall,
            )

            // Progress text
            Card(
                colors =
                    CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.secondaryContainer,
                    ),
            ) {
                Text(
                    text = progress,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(16.dp),
                )
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
                    progress = "Initializing..."
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
                                    progress = "Processing..."
                                } catch (_: Exception) {
                                }
                            },
                        )

                    val nfcHandler = NfcBridgeHandler(activity, router)
                    router.register(nfcHandler)

                    scope.launch {
                        try {
                            progress = "Waiting for NFC tag..."
                            viewModel.updateNfcProgress("Waiting for NFC tag... Hold phone to passport")

                            val tag = nfcHandler.awaitNfcTag()

                            progress = "Tag detected! Reading passport..."
                            viewModel.updateNfcProgress("Tag detected! Reading passport...")

                            val params =
                                mapOf<String, JsonElement>(
                                    "passportNumber" to JsonPrimitive(passportData.passportNumber),
                                    "dateOfBirth" to JsonPrimitive(passportData.dateOfBirth),
                                    "dateOfExpiry" to JsonPrimitive(passportData.dateOfExpiry),
                                    "sessionId" to JsonPrimitive("test-session"),
                                )

                            val result = nfcHandler.handle("scan", params)

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
                                progress = "Error: ${e.message}"
                                viewModel.setError("NFC scan failed: ${e.message}")
                            }
                        }
                    }
                },
                enabled = !isScanning && passportData != null,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (isScanning) "Scanning..." else "Start NFC Scan")
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
