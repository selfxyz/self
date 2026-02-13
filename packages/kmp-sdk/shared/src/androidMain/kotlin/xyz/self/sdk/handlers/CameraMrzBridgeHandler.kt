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
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class CameraMrzBridgeHandler(
    private val activity: Activity,
) : BridgeHandler {

    override val domain = BridgeDomain.CAMERA

    override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement? {
        return when (method) {
            "scanMRZ" -> scanMrz()
            "isAvailable" -> isAvailable()
            else -> throw BridgeHandlerException("METHOD_NOT_FOUND", "Unknown camera method: $method")
        }
    }

    private fun isAvailable(): JsonElement {
        return JsonPrimitive(true)
    }

    /**
     * Opens the camera, runs ML Kit text recognition on each frame, and returns
     * as soon as an MRZ block is detected.
     */
    suspend fun scanMrz(): JsonElement {
        return suspendCancellableCoroutine { cont ->
            val cameraProviderFuture = ProcessCameraProvider.getInstance(activity)
            cameraProviderFuture.addListener({
                try {
                    val cameraProvider = cameraProviderFuture.get()
                    val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

                    val imageAnalysis = ImageAnalysis.Builder()
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build()

                    imageAnalysis.setAnalyzer(ContextCompat.getMainExecutor(activity)) { imageProxy ->
                        processFrame(imageProxy, recognizer) { mrzResult ->
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
                            BridgeHandlerException("CAMERA_INIT_FAILED", "Failed to start camera: ${e.message}")
                        )
                    }
                }
            }, ContextCompat.getMainExecutor(activity))
        }
    }

    @androidx.camera.core.ExperimentalGetImage
    private fun processFrame(
        imageProxy: ImageProxy,
        recognizer: com.google.mlkit.vision.text.TextRecognizer,
        onMrzFound: (JsonElement?) -> Unit,
    ) {
        val mediaImage = imageProxy.image
        if (mediaImage == null) {
            imageProxy.close()
            onMrzFound(null)
            return
        }

        val inputImage = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)

        recognizer.process(inputImage)
            .addOnSuccessListener { visionText ->
                val fullText = visionText.text
                val mrzLines = extractMrzLines(fullText)
                if (mrzLines != null) {
                    val parsed = parseMrz(mrzLines)
                    onMrzFound(parsed)
                } else {
                    onMrzFound(null)
                }
            }
            .addOnFailureListener {
                Log.w(TAG, "Text recognition failed", it)
                onMrzFound(null)
            }
            .addOnCompleteListener {
                imageProxy.close()
            }
    }

    companion object {
        private const val TAG = "CameraMrzBridgeHandler"

        // TD3 (passport) MRZ: two lines of 44 characters
        private val MRZ_TD3_LINE = Regex("[A-Z0-9<]{44}")
        // TD1 (ID card) MRZ: three lines of 30 characters
        private val MRZ_TD1_LINE = Regex("[A-Z0-9<]{30}")

        /**
         * Extract MRZ lines from OCR text. Returns the MRZ lines if found, or null.
         */
        fun extractMrzLines(text: String): List<String>? {
            val cleanedLines = text.lines()
                .map { it.trim().replace(" ", "").uppercase() }
                .filter { it.isNotEmpty() }

            // Try TD3 (passport) format: 2 lines of 44 chars
            val td3Lines = cleanedLines.filter { MRZ_TD3_LINE.matches(it) }
            if (td3Lines.size >= 2) {
                val first = td3Lines.first { it.startsWith("P") || it.startsWith("V") }
                val idx = td3Lines.indexOf(first)
                if (idx >= 0 && idx + 1 < td3Lines.size) {
                    return listOf(td3Lines[idx], td3Lines[idx + 1])
                }
                // Fallback: just take the last two matching lines
                return td3Lines.takeLast(2)
            }

            // Try TD1 (ID card) format: 3 lines of 30 chars
            val td1Lines = cleanedLines.filter { MRZ_TD1_LINE.matches(it) }
            if (td1Lines.size >= 3) {
                return td1Lines.takeLast(3)
            }

            return null
        }

        /**
         * Parse MRZ lines into structured data.
         * Supports TD3 (passport, 2 lines of 44 chars).
         */
        fun parseMrz(lines: List<String>): JsonElement {
            if (lines.size == 2 && lines[0].length == 44) {
                return parseTd3(lines[0], lines[1])
            }
            if (lines.size == 3 && lines[0].length == 30) {
                return parseTd1(lines[0], lines[1], lines[2])
            }
            return buildJsonObject {
                put("raw", lines.joinToString("\n"))
            }
        }

        private fun parseTd3(line1: String, line2: String): JsonElement {
            val documentCode = line1.substring(0, 2).trimFiller()
            val issuingState = line1.substring(2, 5).trimFiller()
            val nameField = line1.substring(5, 44)
            val nameParts = nameField.split("<<", limit = 2)
            val surname = nameParts[0].replace("<", " ").trim()
            val givenNames = if (nameParts.size > 1) nameParts[1].replace("<", " ").trim() else ""

            val documentNumber = line2.substring(0, 9).trimFiller()
            val nationality = line2.substring(10, 13).trimFiller()
            val dateOfBirth = line2.substring(13, 19)
            val gender = line2.substring(20, 21).trimFiller()
            val dateOfExpiry = line2.substring(21, 27)
            val personalNumber = line2.substring(28, 42).trimFiller()

            return buildJsonObject {
                put("documentType", documentCode)
                put("issuingState", issuingState)
                put("surname", surname)
                put("givenNames", givenNames)
                put("documentNumber", documentNumber)
                put("nationality", nationality)
                put("dateOfBirth", dateOfBirth)
                put("gender", gender)
                put("dateOfExpiry", dateOfExpiry)
                put("personalNumber", personalNumber)
                put("raw", "$line1\n$line2")
            }
        }

        private fun parseTd1(line1: String, line2: String, line3: String): JsonElement {
            val documentCode = line1.substring(0, 2).trimFiller()
            val issuingState = line1.substring(2, 5).trimFiller()
            val documentNumber = line1.substring(5, 14).trimFiller()

            val dateOfBirth = line2.substring(0, 6)
            val gender = line2.substring(7, 8).trimFiller()
            val dateOfExpiry = line2.substring(8, 14)
            val nationality = line2.substring(15, 18).trimFiller()

            val nameField = line3
            val nameParts = nameField.split("<<", limit = 2)
            val surname = nameParts[0].replace("<", " ").trim()
            val givenNames = if (nameParts.size > 1) nameParts[1].replace("<", " ").trim() else ""

            return buildJsonObject {
                put("documentType", documentCode)
                put("issuingState", issuingState)
                put("documentNumber", documentNumber)
                put("nationality", nationality)
                put("dateOfBirth", dateOfBirth)
                put("gender", gender)
                put("dateOfExpiry", dateOfExpiry)
                put("surname", surname)
                put("givenNames", givenNames)
                put("raw", "$line1\n$line2\n$line3")
            }
        }

        private fun String.trimFiller(): String = this.replace("<", "").trim()
    }
}
