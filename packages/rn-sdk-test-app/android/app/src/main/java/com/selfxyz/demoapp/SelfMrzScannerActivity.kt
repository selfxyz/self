// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package com.selfxyz.demoapp

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.FrameLayout
import android.widget.TextView
import android.view.View
import android.graphics.drawable.GradientDrawable
import android.util.TypedValue
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class SelfMrzScannerActivity : ComponentActivity() {
    private lateinit var previewView: PreviewView
    private lateinit var cameraExecutor: ExecutorService
    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

    @Volatile
    private var hasResult = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        cameraExecutor = Executors.newSingleThreadExecutor()

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                setResult(RESULT_CANCELED)
                finish()
            }
        })

        setContentView(createScannerView())

        if (hasCameraPermission()) {
            startCamera()
        } else {
            requestPermissions(arrayOf(Manifest.permission.CAMERA), REQUEST_CAMERA_PERMISSION)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        recognizer.close()
        cameraExecutor.shutdown()
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray,
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != REQUEST_CAMERA_PERMISSION) {
            return
        }

        if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            startCamera()
        } else {
            setResult(RESULT_CANCELED)
            finish()
        }
    }

    private fun hasCameraPermission(): Boolean =
        ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED

    private fun createScannerView(): FrameLayout {
        val root = FrameLayout(this)

        previewView = PreviewView(this)
        previewView.layoutParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT,
        )
        root.addView(previewView)

        val guideFrame = View(this)
        guideFrame.background = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            setColor(0x00000000)
            setStroke(dp(3), 0xFFFFFFFF.toInt())
            cornerRadius = dp(14).toFloat()
        }
        guideFrame.layoutParams = FrameLayout.LayoutParams(
            dp(340),
            dp(180),
            Gravity.CENTER,
        )
        root.addView(guideFrame)

        val instruction = TextView(this)
        instruction.text = "Align the MRZ lines inside the frame"
        instruction.setBackgroundColor(0xAA000000.toInt())
        instruction.setTextColor(0xFFFFFFFF.toInt())
        instruction.setPadding(dp(16), dp(12), dp(16), dp(12))
        instruction.layoutParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
            Gravity.TOP or Gravity.CENTER_HORIZONTAL,
        ).apply {
            topMargin = dp(24)
        }
        root.addView(instruction)

        val privacyNote = TextView(this)
        privacyNote.text = "No photo is captured"
        privacyNote.setTextColor(0xFFFFFFFF.toInt())
        privacyNote.setBackgroundColor(0xAA000000.toInt())
        privacyNote.setPadding(dp(12), dp(8), dp(12), dp(8))
        privacyNote.layoutParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
            Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL,
        ).apply {
            bottomMargin = dp(96)
        }
        root.addView(privacyNote)

        val cancelButton = Button(this)
        cancelButton.text = "Cancel"
        cancelButton.setAllCaps(false)
        cancelButton.setTextColor(0xFFFFFFFF.toInt())
        cancelButton.background = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            setColor(0xAA111827.toInt())
            cornerRadius = dp(10).toFloat()
        }
        cancelButton.setOnClickListener {
            setResult(RESULT_CANCELED)
            finish()
        }
        cancelButton.layoutParams = FrameLayout.LayoutParams(
            dp(140),
            dp(44),
            Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL,
        ).apply {
            bottomMargin = dp(36)
        }
        root.addView(cancelButton)

        return root
    }

    private fun dp(value: Int): Int =
        TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value.toFloat(),
            resources.displayMetrics,
        ).toInt()

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()

            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(previewView.surfaceProvider)
            }

            val analysis =
                ImageAnalysis
                    .Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .build()

            analysis.setAnalyzer(cameraExecutor) { imageProxy ->
                val mediaImage = imageProxy.image
                if (mediaImage == null || hasResult) {
                    imageProxy.close()
                    return@setAnalyzer
                }

                val inputImage =
                    InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)

                recognizer
                    .process(inputImage)
                    .addOnSuccessListener { result ->
                        if (hasResult) {
                            return@addOnSuccessListener
                        }

                        val parsed = SelfMrzParser.parse(result.text)
                        if (parsed != null) {
                            hasResult = true
                            val data = Intent().apply {
                                putExtra(EXTRA_DOCUMENT_NUMBER, parsed.documentNumber)
                                putExtra(EXTRA_DATE_OF_BIRTH, parsed.dateOfBirth)
                                putExtra(EXTRA_DATE_OF_EXPIRY, parsed.dateOfExpiry)
                            }
                            setResult(RESULT_OK, data)
                            cameraProvider.unbindAll()
                            finish()
                        }
                    }.addOnCompleteListener {
                        imageProxy.close()
                    }
            }

            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
            cameraProvider.unbindAll()
            cameraProvider.bindToLifecycle(this, cameraSelector, preview, analysis)
        }, ContextCompat.getMainExecutor(this))
    }

    companion object {
        const val EXTRA_DOCUMENT_NUMBER = "documentNumber"
        const val EXTRA_DATE_OF_BIRTH = "dateOfBirth"
        const val EXTRA_DATE_OF_EXPIRY = "dateOfExpiry"

        private const val REQUEST_CAMERA_PERMISSION = 1101
    }
}
