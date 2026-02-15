package xyz.self.testapp.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import xyz.self.sdk.models.NfcScanState
import xyz.self.testapp.components.NfcProgressIndicator
import xyz.self.testapp.models.VerificationFlowState
import xyz.self.testapp.utils.Logger
import xyz.self.testapp.viewmodels.VerificationViewModel
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

@OptIn(ExperimentalForeignApi::class, ExperimentalMaterial3Api::class)
@Composable
fun NfcScanScreen(
    navController: NavController,
    viewModel: VerificationViewModel,
) {
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
    var errorMessage by remember { mutableStateOf<String?>(null) }

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

            // Error message
            if (hasError && errorMessage != null) {
                Card(
                    colors =
                        CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer,
                        ),
                ) {
                    Text(
                        text = errorMessage ?: "Unknown error",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.padding(16.dp),
                    )
                }
            }

            // Instructions
            if (!isScanning && !hasError) {
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
                    if (passportData == null) {
                        viewModel.setError("Passport data not available")
                        return@Button
                    }

                    // Check if NFC is available
                    if (!isNfcAvailable()) {
                        hasError = true
                        errorMessage = "NFC is not available on this device. Please use a physical iPhone with NFC support."
                        viewModel.setError("NFC not available")
                        return@Button
                    }

                    isScanning = true
                    hasError = false
                    errorMessage = null
                    scanState = null

                    // Ensure ViewModel state is NfcScan
                    if (state !is VerificationFlowState.NfcScan) {
                        viewModel.skipMrzScan(passportData)
                    }
                    viewModel.updateNfcProgress("Starting NFC scan...")

                    scope.launch {
                        try {
                            val result =
                                scanPassportWithNfc(
                                    passportNumber = passportData.passportNumber,
                                    dateOfBirth = passportData.dateOfBirth,
                                    dateOfExpiry = passportData.dateOfExpiry,
                                    onProgress = { state ->
                                        scanState = state
                                        viewModel.updateNfcProgress(state.message)
                                    },
                                )

                            withContext(Dispatchers.Main) {
                                isScanning = false
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
                                errorMessage = e.message ?: "Unknown error"
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

/**
 * Checks if NFC is available on this device
 */
@OptIn(ExperimentalForeignApi::class)
private fun isNfcAvailable(): Boolean {
    if (NfcScanFactory.instance == null) return false
    return platform.Foundation.NSProcessInfo.processInfo.environment["SIMULATOR_DEVICE_NAME"] == null
}

/**
 * Scans passport using NFC via Swift helper (through factory bridge)
 */
private suspend fun scanPassportWithNfc(
    passportNumber: String,
    dateOfBirth: String,
    dateOfExpiry: String,
    onProgress: (NfcScanState) -> Unit,
): JsonElement =
    suspendCancellableCoroutine { cont ->
        val factory = NfcScanFactory.instance
        if (factory == null) {
            cont.resumeWithException(
                Exception("NFC scanner not configured. Factory not registered from iOS app."),
            )
            return@suspendCancellableCoroutine
        }

        factory.scanPassport(
            passportNumber = passportNumber,
            dateOfBirth = dateOfBirth,
            dateOfExpiry = dateOfExpiry,
            onProgress = { stateAny ->
                try {
                    val stateIndex =
                        when (stateAny) {
                            is Long -> stateAny.toInt()
                            is Int -> stateAny
                            is Number -> stateAny.toInt()
                            else -> 0
                        }
                    val state = NfcScanState.entries.getOrNull(stateIndex)
                    if (state != null) {
                        onProgress(state)
                    }
                } catch (e: Exception) {
                    Logger.e("NfcScan", "Failed to convert progress state", e)
                }
            },
            onComplete = { resultAny ->
                try {
                    val jsonString = resultAny as? String ?: resultAny.toString()
                    val jsonElement = Json.parseToJsonElement(jsonString)
                    if (cont.isActive) cont.resume(jsonElement)
                } catch (e: Exception) {
                    if (cont.isActive) cont.resumeWithException(Exception("Failed to parse NFC result: ${e.message}"))
                }
            },
            onError = { error ->
                if (cont.isActive) cont.resumeWithException(Exception(error))
            },
        )
    }

/**
 * Factory interface for creating NFC scan sessions.
 * Implemented and registered by the iOS app (NfcScanFactoryImpl.swift).
 */
interface NfcScanViewFactory {
    fun scanPassport(
        passportNumber: String,
        dateOfBirth: String,
        dateOfExpiry: String,
        onProgress: (Any) -> Unit,
        onComplete: (Any) -> Unit,
        onError: (String) -> Unit,
    )
}

/**
 * Singleton to hold the factory instance (set from iOS app)
 */
object NfcScanFactory {
    var instance: NfcScanViewFactory? = null
}
