package xyz.self.testapp.components

import android.app.Activity
import android.util.Log
import androidx.camera.view.PreviewView
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import kotlinx.serialization.json.JsonElement
import xyz.self.sdk.handlers.CameraMrzBridgeHandler

private const val TAG = "CameraPreview"

/**
 * Composable that displays a camera preview and performs MRZ scanning
 *
 * @param onMrzDetected Callback invoked when MRZ is successfully detected
 * @param onError Callback invoked when an error occurs
 * @param showViewfinder Whether to show the MRZ viewfinder overlay (default: true)
 */
@Composable
fun CameraPreviewComposable(
    onMrzDetected: (JsonElement) -> Unit,
    onError: (String) -> Unit,
    modifier: Modifier = Modifier,
    showViewfinder: Boolean = true,
) {
    val context = LocalContext.current
    val activity = context as? Activity

    var previewView: PreviewView? by remember { mutableStateOf(null) }

    LaunchedEffect(previewView, activity) {
        Log.d(TAG, "LaunchedEffect triggered - previewView: ${previewView != null}, activity: ${activity != null}")
        if (previewView != null && activity != null) {
            try {
                Log.d(TAG, "Creating CameraMrzBridgeHandler...")
                val handler = CameraMrzBridgeHandler(activity)
                Log.d(TAG, "Starting MRZ scan with preview...")
                val result = handler.scanMrzWithPreview(previewView!!)
                Log.d(TAG, "MRZ detected! Result: $result")
                onMrzDetected(result)
            } catch (e: Exception) {
                Log.e(TAG, "Camera error occurred", e)
                onError("Camera error: ${e.message}")
            }
        } else {
            Log.w(TAG, "Waiting for preview or activity to be ready...")
        }
    }

    Box(modifier = modifier) {
        AndroidView(
            factory = { ctx ->
                PreviewView(ctx).apply {
                    implementationMode = PreviewView.ImplementationMode.COMPATIBLE
                    previewView = this
                }
            },
            modifier = Modifier.fillMaxSize(),
        )

        // Overlay MRZ viewfinder to guide users
        if (showViewfinder) {
            MrzViewfinder()
        }
    }
}
