package xyz.self.testapp

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.MessageRouter
import xyz.self.sdk.handlers.CameraMrzBridgeHandler
import xyz.self.sdk.handlers.NfcBridgeHandler
import xyz.self.sdk.models.NfcScanParams

@Composable
actual fun PlatformTestButtons(
    state: ScanState,
    onStateChange: (ScanState) -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val json = Json { prettyPrint = true }

    fun appendLog(msg: String) {
        onStateChange(state.copy(log = state.log + "$msg\n"))
    }

    // Camera permission launcher
    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            appendLog("Camera permission granted")
        } else {
            appendLog("ERROR: Camera permission denied")
        }
    }

    // --- NFC Scan Button ---
    Button(
        onClick = {
            if (state.passportNumber.isBlank() || state.dateOfBirth.isBlank() || state.dateOfExpiry.isBlank()) {
                appendLog("ERROR: Fill in passport number, DOB, and DOE first")
                return@Button
            }

            onStateChange(state.copy(isScanning = true, log = state.log + "Starting NFC scan...\n"))

            val activity = context as android.app.Activity
            val router = MessageRouter(
                sendToWebView = { js ->
                    // Log bridge events to the UI
                    val cleaned = js
                        .removePrefix("window.SelfNativeBridge._handleEvent(")
                        .removePrefix("window.SelfNativeBridge._handleResponse(")
                        .removeSuffix(")")
                        .removeSurrounding("'")
                        .replace("\\'", "'")
                        .replace("\\\\", "\\")
                    try {
                        val element = Json.parseToJsonElement(cleaned)
                        onStateChange(state.copy(
                            log = state.log + "Event: $cleaned\n"
                        ))
                    } catch (_: Exception) {}
                }
            )

            val nfcHandler = NfcBridgeHandler(activity, router)
            router.register(nfcHandler)

            scope.launch {
                try {
                    appendLog("Waiting for NFC tag... Hold phone to passport")
                    val tag = nfcHandler.awaitNfcTag()
                    appendLog("Tag detected! Reading passport...")

                    val params = mapOf<String, JsonElement>(
                        "passportNumber" to kotlinx.serialization.json.JsonPrimitive(state.passportNumber),
                        "dateOfBirth" to kotlinx.serialization.json.JsonPrimitive(state.dateOfBirth),
                        "dateOfExpiry" to kotlinx.serialization.json.JsonPrimitive(state.dateOfExpiry),
                        "sessionId" to kotlinx.serialization.json.JsonPrimitive("test-session"),
                    )

                    val result = nfcHandler.handle("scan", params)
                    val resultStr = result?.let { json.encodeToString(JsonElement.serializer(), it) } ?: "null"
                    onStateChange(state.copy(
                        isScanning = false,
                        log = state.log + "SUCCESS:\n$resultStr\n"
                    ))
                } catch (e: Exception) {
                    onStateChange(state.copy(
                        isScanning = false,
                        log = state.log + "ERROR: ${e.message}\n"
                    ))
                }
            }
        },
        enabled = !state.isScanning,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Text(if (state.isScanning) "Scanning..." else "Scan Passport (NFC)")
    }

    Spacer(modifier = Modifier.height(8.dp))

    // --- Camera MRZ Scan Button ---
    Button(
        onClick = {
            val activity = context as android.app.Activity

            // Check camera permission
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED
            ) {
                cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                return@Button
            }

            onStateChange(state.copy(isScanning = true, log = state.log + "Starting camera MRZ scan...\n"))

            val cameraMrzHandler = CameraMrzBridgeHandler(activity)

            scope.launch {
                try {
                    val result = cameraMrzHandler.scanMrz()
                    val resultStr = json.encodeToString(JsonElement.serializer(), result)
                    withContext(Dispatchers.Main) {
                        onStateChange(state.copy(
                            isScanning = false,
                            log = state.log + "MRZ DETECTED:\n$resultStr\n"
                        ))
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) {
                        onStateChange(state.copy(
                            isScanning = false,
                            log = state.log + "MRZ ERROR: ${e.message}\n"
                        ))
                    }
                }
            }
        },
        enabled = !state.isScanning,
        modifier = Modifier.fillMaxWidth(),
        colors = ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.secondary,
        ),
    ) {
        Text(if (state.isScanning) "Scanning..." else "Scan MRZ (Camera)")
    }
}
