package xyz.self.testapp.screens

import android.Manifest
import android.content.pm.PackageManager
import android.util.Log
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import xyz.self.testapp.components.CameraPreviewComposable
import xyz.self.testapp.models.PassportData
import xyz.self.testapp.models.VerificationFlowState
import xyz.self.testapp.viewmodels.VerificationViewModel

private const val TAG = "MrzScanScreen"

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MrzScanScreen(
    navController: NavController,
    viewModel: VerificationViewModel,
) {
    Log.d(TAG, "MrzScanScreen composing...")
    val context = LocalContext.current
    val state by viewModel.state.collectAsStateWithLifecycle()

    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.CAMERA,
            ) == PackageManager.PERMISSION_GRANTED,
        )
    }

    val launcher =
        rememberLauncherForActivityResult(
            contract = ActivityResultContracts.RequestPermission(),
        ) { isGranted ->
            hasCameraPermission = isGranted
        }

    LaunchedEffect(Unit) {
        if (!hasCameraPermission) {
            launcher.launch(Manifest.permission.CAMERA)
        }
    }

    val currentPassportData =
        when (state) {
            is VerificationFlowState.MrzScan -> (state as VerificationFlowState.MrzScan).passportData
            else -> PassportData()
        }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Scan MRZ") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.Close, contentDescription = "Close")
                    }
                },
            )
        },
    ) { paddingValues ->
        Box(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
        ) {
            when {
                !hasCameraPermission -> {
                    // Permission denied
                    Column(
                        modifier =
                            Modifier
                                .fillMaxSize()
                                .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                    ) {
                        Text(
                            text = "Camera Permission Required",
                            style = MaterialTheme.typography.headlineSmall,
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Camera access is needed to scan the MRZ code on your passport.",
                            style = MaterialTheme.typography.bodyMedium,
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = { launcher.launch(Manifest.permission.CAMERA) }) {
                            Text("Grant Permission")
                        }
                    }
                }

                else -> {
                    // Camera preview with MRZ scanning
                    CameraPreviewComposable(
                        onMrzDetected = { mrzResult ->
                            Log.d(TAG, "onMrzDetected callback triggered!")
                            Log.d(TAG, "MRZ Result: $mrzResult")
                            // Parse MRZ result and show confirmation screen
                            try {
                                val mrzObj = mrzResult.jsonObject
                                val passportNumber = mrzObj["documentNumber"]?.jsonPrimitive?.content ?: ""
                                val dateOfBirth = mrzObj["dateOfBirth"]?.jsonPrimitive?.content ?: ""
                                val dateOfExpiry = mrzObj["dateOfExpiry"]?.jsonPrimitive?.content ?: ""

                                Log.d(TAG, "Parsed - Passport: $passportNumber, DOB: $dateOfBirth, Expiry: $dateOfExpiry")

                                val updatedPassportData =
                                    PassportData(
                                        passportNumber = passportNumber,
                                        dateOfBirth = dateOfBirth,
                                        dateOfExpiry = dateOfExpiry,
                                    )

                                // Show confirmation screen with scanned data
                                viewModel.showMrzConfirmation(
                                    passportData = updatedPassportData,
                                    rawMrzData = mrzResult,
                                )
                                Log.d(TAG, "Navigating to mrz_confirmation...")
                                navController.navigate("mrz_confirmation") {
                                    popUpTo("mrz_scan") { inclusive = true }
                                }
                            } catch (e: Exception) {
                                Log.e(TAG, "Failed to parse MRZ", e)
                                viewModel.setError("Failed to parse MRZ: ${e.message}")
                            }
                        },
                        onError = { error ->
                            Log.e(TAG, "onError callback triggered: $error")
                            viewModel.setError(error)
                        },
                        modifier = Modifier.fillMaxSize(),
                    )

                    // Scanning guide overlay
                    Column(
                        modifier =
                            Modifier
                                .fillMaxSize()
                                .padding(16.dp),
                        verticalArrangement = Arrangement.SpaceBetween,
                    ) {
                        // Top instruction
                        Card(
                            colors =
                                CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f),
                                ),
                        ) {
                            Text(
                                text =
                                    "Position the MRZ (Machine Readable Zone) within the frame.\n" +
                                        "The MRZ is the two-line code at the bottom of your passport.",
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.padding(16.dp),
                            )
                        }

                        // Bottom action
                        Button(
                            onClick = {
                                viewModel.skipMrzScan(currentPassportData)
                                navController.navigate("nfc_scan") {
                                    popUpTo("mrz_scan") { inclusive = true }
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors =
                                ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.secondary,
                                ),
                        ) {
                            Text("Skip MRZ Scan")
                        }
                    }
                }
            }
        }
    }
}
