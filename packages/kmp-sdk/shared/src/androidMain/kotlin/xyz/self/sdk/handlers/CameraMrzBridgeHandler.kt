// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.handlers

import android.app.Activity
import android.util.Log
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException
import xyz.self.sdk.models.MrzDetectionState
import xyz.self.sdk.models.MrzParser
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class CameraMrzBridgeHandler(
    private val activity: Activity,
) : BridgeHandler {
    override val domain = BridgeDomain.CAMERA

    override suspend fun handle(
        method: String,
        params: Map<String, JsonElement>,
    ): JsonElement? =
        when (method) {
            "scanMRZ" -> scanMrz()
            "isAvailable" -> isAvailable()
            else -> throw BridgeHandlerException("METHOD_NOT_FOUND", "Unknown camera method: $method")
        }

    private fun isAvailable(): JsonElement = JsonPrimitive(true)

    /**
     * Opens the camera, runs ML Kit text recognition on each frame, and returns
     * as soon as an MRZ block is detected.
     */
    suspend fun scanMrz(): JsonElement =
        suspendCancellableCoroutine { cont ->
            val cameraProviderFuture = ProcessCameraProvider.getInstance(activity)
            cameraProviderFuture.addListener({
                try {
                    val cameraProvider = cameraProviderFuture.get()
                    val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

                    val imageAnalysis =
                        ImageAnalysis
                            .Builder()
                            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                            .build()

                    imageAnalysis.setAnalyzer(ContextCompat.getMainExecutor(activity)) { imageProxy ->
                        processFrame(imageProxy, recognizer, null) { mrzResult ->
                            if (mrzResult != null && cont.isActive) {
                                cameraProvider.unbindAll()
                                recognizer.close()
                                cont.resume(mrzResult)
                            }
                        }
                    }

                    val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

                    cameraProvider.unbindAll()
                    cameraProvider.bindToLifecycle(
                        activity as LifecycleOwner,
                        cameraSelector,
                        imageAnalysis,
                    )

                    cont.invokeOnCancellation {
                        cameraProvider.unbindAll()
                        recognizer.close()
                    }
                } catch (e: Exception) {
                    if (cont.isActive) {
                        cont.resumeWithException(
                            BridgeHandlerException("CAMERA_INIT_FAILED", "Failed to start camera: ${e.message}"),
                        )
                    }
                }
            }, ContextCompat.getMainExecutor(activity))
        }

    /**
     * Opens the camera with a preview, runs ML Kit text recognition on each frame,
     * and returns as soon as an MRZ block is detected.
     *
     * This variant displays the camera feed in the provided PreviewView.
     *
     * @param previewView The PreviewView to display the camera feed
     * @param onProgress Optional callback that receives detection progress updates
     * @return JsonElement containing the parsed MRZ data
     */
    suspend fun scanMrzWithPreview(
        previewView: PreviewView,
        onProgress: ((MrzDetectionState) -> Unit)? = null,
    ): JsonElement =
        suspendCancellableCoroutine { cont ->
            val cameraProviderFuture = ProcessCameraProvider.getInstance(activity)
            cameraProviderFuture.addListener({
                try {
                    val cameraProvider = cameraProviderFuture.get()
                    val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

                    // Create the preview use case and connect it to the PreviewView
                    val preview =
                        Preview.Builder().build().also {
                            it.setSurfaceProvider(previewView.surfaceProvider)
                        }

                    // Create the image analysis use case for MRZ detection
                    val imageAnalysis =
                        ImageAnalysis
                            .Builder()
                            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                            .build()

                    imageAnalysis.setAnalyzer(ContextCompat.getMainExecutor(activity)) { imageProxy ->
                        processFrame(imageProxy, recognizer, onProgress) { mrzResult ->
                            if (mrzResult != null && cont.isActive) {
                                cameraProvider.unbindAll()
                                recognizer.close()
                                cont.resume(mrzResult)
                            }
                        }
                    }

                    val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

                    // Unbind all use cases before rebinding
                    cameraProvider.unbindAll()

                    // Bind both preview and analysis to the lifecycle
                    cameraProvider.bindToLifecycle(
                        activity as LifecycleOwner,
                        cameraSelector,
                        preview, // Add preview to show camera feed
                        imageAnalysis,
                    )

                    cont.invokeOnCancellation {
                        cameraProvider.unbindAll()
                        recognizer.close()
                    }
                } catch (e: Exception) {
                    if (cont.isActive) {
                        cont.resumeWithException(
                            BridgeHandlerException("CAMERA_INIT_FAILED", "Failed to start camera: ${e.message}"),
                        )
                    }
                }
            }, ContextCompat.getMainExecutor(activity))
        }

    @androidx.camera.core.ExperimentalGetImage
    private fun processFrame(
        imageProxy: ImageProxy,
        recognizer: com.google.mlkit.vision.text.TextRecognizer,
        onProgress: ((MrzDetectionState) -> Unit)?,
        onMrzFound: (JsonElement?) -> Unit,
    ) {
        val mediaImage = imageProxy.image
        if (mediaImage == null) {
            imageProxy.close()
            onProgress?.invoke(MrzDetectionState.NO_TEXT)
            onMrzFound(null)
            return
        }

        val inputImage = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)

        recognizer
            .process(inputImage)
            .addOnSuccessListener { visionText ->
                val fullText = visionText.text

                // Report progress based on what we detect
                if (fullText.isBlank()) {
                    onProgress?.invoke(MrzDetectionState.NO_TEXT)
                } else {
                    // Check for MRZ patterns
                    val cleanedLines =
                        fullText
                            .lines()
                            .map { it.trim().replace(" ", "").uppercase() }
                            .filter { it.isNotEmpty() }

                    val td3Lines = cleanedLines.filter { MRZ_TD3_LINE.matches(it) }
                    val td1Lines = cleanedLines.filter { MRZ_TD1_LINE.matches(it) }

                    when {
                        td3Lines.size >= 2 || td1Lines.size >= 3 -> {
                            onProgress?.invoke(MrzDetectionState.TWO_MRZ_LINES)
                        }
                        td3Lines.size == 1 || td1Lines.size in 1..2 -> {
                            onProgress?.invoke(MrzDetectionState.ONE_MRZ_LINE)
                        }
                        else -> {
                            onProgress?.invoke(MrzDetectionState.TEXT_DETECTED)
                        }
                    }
                }

                // Try to extract and parse MRZ
                val mrzLines = extractMrzLines(fullText)
                if (mrzLines != null) {
                    val parsed = parseMrz(mrzLines)
                    onMrzFound(parsed)
                } else {
                    onMrzFound(null)
                }
            }.addOnFailureListener {
                Log.w(TAG, "Text recognition failed", it)
                onProgress?.invoke(MrzDetectionState.NO_TEXT)
                onMrzFound(null)
            }.addOnCompleteListener {
                imageProxy.close()
            }
    }

    companion object {
        private const val TAG = "CameraMrzBridgeHandler"

        // Delegate regex constants to shared MrzParser
        private val MRZ_TD3_LINE = MrzParser.MRZ_TD3_LINE
        private val MRZ_TD1_LINE = MrzParser.MRZ_TD1_LINE

        fun extractMrzLines(text: String): List<String>? = MrzParser.extractMrzLines(text)

        fun parseMrz(lines: List<String>): JsonElement = MrzParser.parseMrz(lines)
    }
}
