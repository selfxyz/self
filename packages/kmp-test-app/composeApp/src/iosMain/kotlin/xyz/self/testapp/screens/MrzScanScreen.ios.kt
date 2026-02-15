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
import kotlinx.serialization.json.Json
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
import platform.Foundation.NSURL
import platform.UIKit.UIApplication
import platform.UIKit.UIApplicationOpenSettingsURLString
import platform.UIKit.UIColor
import platform.UIKit.UIView
import xyz.self.sdk.models.MrzDetectionState
import xyz.self.testapp.components.MrzViewfinder
import xyz.self.testapp.models.PassportData
import xyz.self.testapp.models.VerificationFlowState
import xyz.self.testapp.utils.Logger
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
    var showCameraError by remember { mutableStateOf(false) }
    var hasNavigated by remember { mutableStateOf(false) }

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
                            val settingsUrl = NSURL.URLWithString(UIApplicationOpenSettingsURLString)
                            if (settingsUrl != null) {
                                UIApplication.sharedApplication.openURL(settingsUrl)
                            }
                        }) {
                            Text("Open Settings")
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedButton(onClick = {
                            scope.launch {
                                hasCameraPermission = requestCameraPermission()
                            }
                        }) {
                            Text("Check Again")
                        }
                    }
                }

                showCameraError -> {
                    // Camera integration not ready
                    Column(
                        modifier =
                            Modifier
                                .fillMaxSize()
                                .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                    ) {
                        Text(
                            text = "📷 Camera Not Available",
                            style = MaterialTheme.typography.headlineMedium,
                        )
                        Spacer(modifier = Modifier.height(24.dp))
                        Card(
                            colors =
                                CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.secondaryContainer,
                                ),
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                            ) {
                                Text(
                                    text = "The MRZ camera scanner is still in development.",
                                    style = MaterialTheme.typography.bodyLarge,
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text =
                                        "You can skip this step and manually enter your passport details, " +
                                            "or proceed to test the NFC scanning feature.",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color =
                                        MaterialTheme.colorScheme.onSecondaryContainer
                                            .copy(alpha = 0.7f),
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(32.dp))
                        Button(
                            onClick = {
                                viewModel.skipMrzScan(currentPassportData)
                                navController.navigate("nfc_scan") {
                                    popUpTo("mrz_scan") { inclusive = true }
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("Skip to NFC Scan")
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedButton(
                            onClick = {
                                navController.popBackStack()
                            },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("Back to Passport Details")
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
                                        scope.launch {
                                            try {
                                                if (hasNavigated) return@launch
                                                val mrzObj = mrzResult.jsonObject
                                                val passportNumber = mrzObj["documentNumber"]?.jsonPrimitive?.content ?: ""
                                                val dateOfBirth = mrzObj["dateOfBirth"]?.jsonPrimitive?.content ?: ""
                                                val dateOfExpiry = mrzObj["dateOfExpiry"]?.jsonPrimitive?.content ?: ""

                                                if (passportNumber.isBlank() || dateOfBirth.isBlank() || dateOfExpiry.isBlank()) {
                                                    viewModel.setError(
                                                        "Incomplete MRZ data: passport number, date of birth, and date of expiry are required",
                                                    )
                                                    return@launch
                                                }

                                                val updatedPassportData =
                                                    PassportData(
                                                        passportNumber = passportNumber,
                                                        dateOfBirth = dateOfBirth,
                                                        dateOfExpiry = dateOfExpiry,
                                                    )

                                                withContext(Dispatchers.Main) {
                                                    if (hasNavigated) return@withContext
                                                    hasNavigated = true
                                                    viewModel.showMrzConfirmation(
                                                        passportData = updatedPassportData,
                                                        rawMrzData = mrzResult,
                                                    )
                                                    navController.navigate("mrz_confirmation") {
                                                        popUpTo("mrz_scan") { inclusive = true }
                                                    }
                                                }
                                            } catch (e: Exception) {
                                                Logger.e("MrzScan", "Failed to parse MRZ or navigate", e)
                                                viewModel.setError("Failed to parse MRZ: ${e.message}")
                                            }
                                        }
                                    },
                                    onProgress = { state ->
                                        detectionState = state
                                    },
                                    onError = { error ->
                                        Logger.e("MrzScan", "Camera error: $error")
                                        showCameraError = true
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
 *
 * Note: This uses a factory pattern - the iOS app registers the factory implementation
 */
@OptIn(ExperimentalForeignApi::class)
private fun createCameraPreview(
    onMrzDetected: (JsonElement) -> Unit,
    onProgress: (MrzDetectionState) -> Unit,
    onError: (String) -> Unit,
): UIView {
    val factory = MrzCameraFactory.instance

    if (factory != null) {
        return factory.createCameraView(
            onMrzDetected = { result ->
                try {
                    val jsonString = result as? String ?: result.toString()
                    val jsonElement = Json.parseToJsonElement(jsonString)
                    onMrzDetected(jsonElement)
                } catch (e: Exception) {
                    Logger.e("MrzScan", "Failed to parse JSON from Swift", e)
                    onError("Failed to parse scan result")
                }
            },
            onProgress = { stateAny ->
                try {
                    val stateIndex =
                        when (stateAny) {
                            is Long -> stateAny.toInt()
                            is Int -> stateAny
                            is Number -> stateAny.toInt()
                            else -> 0
                        }

                    val state = MrzDetectionState.entries.getOrNull(stateIndex) ?: MrzDetectionState.NO_TEXT

                    onProgress(state)
                } catch (e: Exception) {
                    Logger.e("MrzScan", "Failed to convert progress state", e)
                }
            },
            onError = { error ->
                onError(error)
            },
        )
    }

    onError("MRZ camera not configured. Factory not registered from iOS app.")
    return UIView().apply { backgroundColor = UIColor.blackColor }
}

/**
 * Factory interface for creating MRZ camera views
 * Will be implemented and registered by the iOS app
 */
interface MrzCameraViewFactory {
    fun createCameraView(
        onMrzDetected: (Any) -> Unit,
        onProgress: (Any) -> Unit,
        onError: (String) -> Unit,
    ): UIView
}

/**
 * Singleton to hold the factory instance (set from iOS app)
 */
object MrzCameraFactory {
    var instance: MrzCameraViewFactory? = null
}
