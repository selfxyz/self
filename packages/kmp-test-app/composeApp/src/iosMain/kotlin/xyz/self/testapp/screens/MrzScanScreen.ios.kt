package xyz.self.testapp.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.interop.UIKitView
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import platform.AVFoundation.AVAuthorizationStatusAuthorized
import platform.AVFoundation.AVAuthorizationStatusDenied
import platform.AVFoundation.AVAuthorizationStatusNotDetermined
import platform.AVFoundation.AVAuthorizationStatusRestricted
import platform.AVFoundation.AVCaptureDevice
import platform.AVFoundation.AVMediaTypeVideo
import platform.AVFoundation.authorizationStatusForMediaType
import platform.AVFoundation.requestAccessForMediaType
import platform.Foundation.NSLog
import platform.UIKit.UIView
import xyz.self.sdk.models.MrzDetectionState
import xyz.self.testapp.components.MrzViewfinder
import xyz.self.testapp.models.PassportData
import xyz.self.testapp.models.VerificationFlowState
import xyz.self.testapp.viewmodels.VerificationViewModel
import kotlin.coroutines.resume

@OptIn(ExperimentalMaterial3Api::class, ExperimentalForeignApi::class)
@Composable
fun MrzScanScreen(
    navController: NavController,
    viewModel: VerificationViewModel,
) {
    var detectionState by remember { mutableStateOf<MrzDetectionState?>(null) }
    val state by viewModel.state.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()

    var hasCameraPermission by remember { mutableStateOf(checkCameraPermission()) }
    var isRequestingPermission by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        if (!hasCameraPermission && !isRequestingPermission) {
            isRequestingPermission = true
            hasCameraPermission = requestCameraPermission()
            isRequestingPermission = false
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
                isRequestingPermission -> {
                    // Requesting permission
                    Column(
                        modifier =
                            Modifier
                                .fillMaxSize()
                                .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                    ) {
                        CircularProgressIndicator()
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Requesting Camera Permission...",
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                }

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
                            text = "Camera access is needed to scan the MRZ code on your passport. Please grant permission in Settings.",
                            style = MaterialTheme.typography.bodyMedium,
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = {
                            // TODO: Open app settings
                            // For now, just check again
                            scope.launch {
                                hasCameraPermission = requestCameraPermission()
                            }
                        }) {
                            Text("Try Again")
                        }
                    }
                }

                else -> {
                    // Camera preview with MRZ scanning
                    Box(modifier = Modifier.fillMaxSize()) {
                        // Native camera preview via UIKitView
                        UIKitView(
                            factory = {
                                createCameraPreview(
                                    onMrzDetected = { mrzResult ->
                                        NSLog("onMrzDetected callback triggered!")
                                        NSLog("MRZ Result: $mrzResult")

                                        scope.launch {
                                            try {
                                                val mrzObj = mrzResult.jsonObject
                                                val passportNumber = mrzObj["documentNumber"]?.jsonPrimitive?.content ?: ""
                                                val dateOfBirth = mrzObj["dateOfBirth"]?.jsonPrimitive?.content ?: ""
                                                val dateOfExpiry = mrzObj["dateOfExpiry"]?.jsonPrimitive?.content ?: ""

                                                NSLog("Parsed - Passport: $passportNumber, DOB: $dateOfBirth, Expiry: $dateOfExpiry")

                                                val updatedPassportData =
                                                    PassportData(
                                                        passportNumber = passportNumber,
                                                        dateOfBirth = dateOfBirth,
                                                        dateOfExpiry = dateOfExpiry,
                                                    )

                                                withContext(Dispatchers.Main) {
                                                    viewModel.showMrzConfirmation(
                                                        passportData = updatedPassportData,
                                                        rawMrzData = mrzResult,
                                                    )
                                                    NSLog("Navigating to mrz_confirmation...")
                                                    navController.navigate("mrz_confirmation") {
                                                        popUpTo("mrz_scan") { inclusive = true }
                                                    }
                                                }
                                            } catch (e: Exception) {
                                                NSLog("Failed to parse MRZ: ${e.message}")
                                                viewModel.setError("Failed to parse MRZ: ${e.message}")
                                            }
                                        }
                                    },
                                    onProgress = { state ->
                                        detectionState = state
                                    },
                                    onError = { error ->
                                        NSLog("onError callback triggered: $error")
                                        viewModel.setError(error)
                                    },
                                )
                            },
                            modifier = Modifier.fillMaxSize(),
                        )

                        // MRZ Viewfinder overlay (now in commonMain)
                        MrzViewfinder(
                            modifier = Modifier.fillMaxSize(),
                            detectionState = detectionState,
                        )

                        // Scanning guide overlay
                        Column(
                            modifier =
                                Modifier
                                    .fillMaxSize()
                                    .padding(16.dp),
                            verticalArrangement = Arrangement.SpaceBetween,
                        ) {
                            // Top instruction - updates based on detection state
                            Card(
                                colors =
                                    CardDefaults.cardColors(
                                        containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f),
                                    ),
                            ) {
                                Text(
                                    text = getInstructionText(detectionState),
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
}

/**
 * Returns instruction text based on the current detection state
 */
private fun getInstructionText(state: MrzDetectionState?): String =
    when (state) {
        null, MrzDetectionState.NO_TEXT ->
            "Position the MRZ (Machine Readable Zone) within the frame.\n" +
                "The MRZ is the two-line code at the bottom of your passport."

        MrzDetectionState.TEXT_DETECTED ->
            "Text detected! Move closer to the MRZ code.\n" +
                "Make sure the two-line code is clearly visible."

        MrzDetectionState.ONE_MRZ_LINE ->
            "One line detected! Almost there...\n" +
                "Hold steady and ensure both MRZ lines are in frame."

        MrzDetectionState.TWO_MRZ_LINES ->
            "Both lines detected! Reading passport data...\n" +
                "Keep the passport steady."
    }

/**
 * Checks if camera permission is granted
 */
@OptIn(ExperimentalForeignApi::class)
private fun checkCameraPermission(): Boolean {
    val status = AVCaptureDevice.authorizationStatusForMediaType(AVMediaTypeVideo)
    return status == AVAuthorizationStatusAuthorized
}

/**
 * Requests camera permission
 */
@OptIn(ExperimentalForeignApi::class)
private suspend fun requestCameraPermission(): Boolean =
    suspendCancellableCoroutine { cont ->
        val currentStatus = AVCaptureDevice.authorizationStatusForMediaType(AVMediaTypeVideo)

        when (currentStatus) {
            AVAuthorizationStatusAuthorized -> cont.resume(true)
            AVAuthorizationStatusNotDetermined -> {
                AVCaptureDevice.requestAccessForMediaType(AVMediaTypeVideo) { granted ->
                    cont.resume(granted)
                }
            }
            AVAuthorizationStatusDenied, AVAuthorizationStatusRestricted -> cont.resume(false)
            else -> cont.resume(false)
        }
    }

/**
 * Creates a native camera preview view with MRZ detection
 */
@OptIn(ExperimentalForeignApi::class)
private fun createCameraPreview(
    onMrzDetected: (JsonElement) -> Unit,
    onProgress: (MrzDetectionState) -> Unit,
    onError: (String) -> Unit,
): UIView {
    // TODO: Create and configure MrzCameraHelper
    // This requires the Swift helper to be properly exposed via Xcode and cinterop

    // For now, create a placeholder view with instructions
    val placeholderView = UIView()
    placeholderView.backgroundColor = platform.UIKit.UIColor.blackColor

    NSLog("Camera preview creation - Swift helper integration pending")
    NSLog("The MrzCameraHelper.swift is created but needs to be:")
    NSLog("1. Added to Xcode project")
    NSLog("2. Properly exposed via @objc for Kotlin interop")
    NSLog("3. Integrated with the Compose UIKitView")

    // Report error about pending integration
    onError(
        "MRZ camera scanning not yet fully integrated. " +
            "The Swift MrzCameraHelper.swift is created but needs to be " +
            "added to the Xcode project and exposed for Kotlin/Native interop.",
    )

    return placeholderView
}
