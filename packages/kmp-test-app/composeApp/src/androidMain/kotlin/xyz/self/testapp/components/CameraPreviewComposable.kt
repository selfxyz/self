package xyz.self.testapp.components

import android.app.Activity
import androidx.camera.view.PreviewView
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonElement
import xyz.self.sdk.handlers.CameraMrzBridgeHandler

/**
 * Composable that displays a camera preview and performs MRZ scanning
 *
 * @param onMrzDetected Callback invoked when MRZ is successfully detected
 * @param onError Callback invoked when an error occurs
 */
@Composable
fun CameraPreviewComposable(
    onMrzDetected: (JsonElement) -> Unit,
    onError: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val activity = context as? Activity
    val scope = rememberCoroutineScope()

    var previewView: PreviewView? by remember { mutableStateOf(null) }

    LaunchedEffect(previewView, activity) {
        if (previewView != null && activity != null) {
            scope.launch {
                try {
                    val handler = CameraMrzBridgeHandler(activity)
                    val result = handler.scanMrzWithPreview(previewView!!)
                    onMrzDetected(result)
                } catch (e: Exception) {
                    onError("Camera error: ${e.message}")
                }
            }
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
    }
}
