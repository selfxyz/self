// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

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
import xyz.self.sdk.models.MrzDetectionState

private const val TAG = "CameraPreview"

/**
 * Composable that displays a camera preview and performs MRZ scanning
 *
 * @param onMrzDetected Callback invoked when MRZ is successfully detected
 * @param onError Callback invoked when an error occurs
 * @param onProgress Callback invoked with detection progress updates
 * @param detectionState Current detection state to display in viewfinder
 * @param showViewfinder Whether to show the MRZ viewfinder overlay (default: true)
 */
@Composable
fun CameraPreviewComposable(
    onMrzDetected: (JsonElement) -> Unit,
    onError: (String) -> Unit,
    modifier: Modifier = Modifier,
    onProgress: ((MrzDetectionState) -> Unit)? = null,
    detectionState: MrzDetectionState? = null,
    showViewfinder: Boolean = true,
) {
    val context = LocalContext.current
    val activity = context as? Activity

    var previewView: PreviewView? by remember { mutableStateOf(null) }

    LaunchedEffect(previewView, activity) {
        if (previewView != null && activity != null) {
            try {
                val handler = CameraMrzBridgeHandler(activity)
                val result =
                    handler.scanMrzWithPreview(
                        previewView = previewView!!,
                        onProgress = { state ->
                            onProgress?.invoke(state)
                        },
                    )
                onMrzDetected(result)
            } catch (e: Exception) {
                Log.e(TAG, "Camera error occurred", e)
                onError("Camera error: ${e.message}")
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

        // Overlay MRZ viewfinder to guide users
        if (showViewfinder) {
            MrzViewfinder(detectionState = detectionState)
        }
    }
}
