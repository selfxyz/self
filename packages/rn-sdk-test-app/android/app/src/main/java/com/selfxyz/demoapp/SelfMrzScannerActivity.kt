// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package com.selfxyz.demoapp

import android.Manifest
import android.animation.ValueAnimator
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.CornerPathEffect
import android.graphics.Paint
import android.graphics.RectF
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import android.widget.Button
import android.widget.FrameLayout
import android.widget.TextView
import android.graphics.drawable.GradientDrawable
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import xyz.self.sdk.handlers.CameraMrzBridgeHandler
import xyz.self.sdk.models.MrzDetectionState

class SelfMrzScannerActivity : ComponentActivity() {
    private lateinit var previewView: PreviewView
    private lateinit var cameraMrzHandler: CameraMrzBridgeHandler
    private lateinit var instructionView: TextView
    private lateinit var viewfinderOverlay: MrzViewfinderView
    private var scanJob: Job? = null

    @Volatile
    private var hasResult = false

    private var currentDetectionState = MrzDetectionState.NO_TEXT

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        cameraMrzHandler = CameraMrzBridgeHandler(this)

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
        scanJob?.cancel()
        super.onDestroy()
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray,
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != REQUEST_CAMERA_PERMISSION) return

        if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            startCamera()
        } else {
            val data = Intent().apply {
                putExtra(EXTRA_ERROR_CODE, "CAMERA_PERMISSION_DENIED")
            }
            setResult(RESULT_CANCELED, data)
            finish()
        }
    }

    private fun hasCameraPermission(): Boolean =
        ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED

    private fun updateDetectionState(state: MrzDetectionState) {
        if (state == currentDetectionState) return
        currentDetectionState = state

        runOnUiThread {
            instructionView.text = getInstructionText(state)
            viewfinderOverlay.setDetectionState(state)
        }
    }

    private fun getInstructionText(state: MrzDetectionState): String =
        when (state) {
            MrzDetectionState.NO_TEXT ->
                "Position the MRZ (Machine Readable Zone) within the frame.\n" +
                    "The MRZ is the two-line code at the bottom of your passport."
            MrzDetectionState.TEXT_DETECTED ->
                "Text detected! Move closer to the MRZ code.\n" +
                    "Make sure the two-line code is clearly visible."
            MrzDetectionState.ONE_MRZ_LINE ->
                "One line detected! Almost there…\n" +
                    "Hold steady and ensure both MRZ lines are in frame."
            MrzDetectionState.TWO_MRZ_LINES ->
                "Both lines detected! Reading passport data…\n" +
                    "Keep the passport steady."
        }

    private fun createScannerView(): FrameLayout {
        val root = FrameLayout(this)

        previewView = PreviewView(this)
        previewView.layoutParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT,
        )
        root.addView(previewView)

        viewfinderOverlay = MrzViewfinderView(this)
        viewfinderOverlay.layoutParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT,
        )
        root.addView(viewfinderOverlay)

        instructionView = TextView(this)
        instructionView.text = getInstructionText(MrzDetectionState.NO_TEXT)
        instructionView.setBackgroundColor(0xBB000000.toInt())
        instructionView.setTextColor(0xFFFFFFFF.toInt())
        instructionView.textSize = 14f
        instructionView.setPadding(dp(16), dp(12), dp(16), dp(12))
        instructionView.layoutParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
            Gravity.TOP or Gravity.CENTER_HORIZONTAL,
        ).apply {
            topMargin = dp(24)
            marginStart = dp(20)
            marginEnd = dp(20)
        }
        root.addView(instructionView)

        val privacyNote = TextView(this)
        privacyNote.text = "No photo is captured"
        privacyNote.setTextColor(0xFFFFFFFF.toInt())
        privacyNote.setBackgroundColor(0xBB000000.toInt())
        privacyNote.textSize = 12f
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
        scanJob?.cancel()
        scanJob =
            lifecycleScope.launch {
                try {
                    val result =
                        cameraMrzHandler.scanMrzWithPreview(
                            previewView = previewView,
                            onProgress = ::updateDetectionState,
                        )
                    if (hasResult) return@launch

                    val parsed = result.jsonObject
                    val documentNumber = parsed[EXTRA_DOCUMENT_NUMBER]?.jsonPrimitive?.contentOrNull
                    val dateOfBirth = parsed[EXTRA_DATE_OF_BIRTH]?.jsonPrimitive?.contentOrNull
                    val dateOfExpiry = parsed[EXTRA_DATE_OF_EXPIRY]?.jsonPrimitive?.contentOrNull

                    if (documentNumber.isNullOrBlank() || dateOfBirth.isNullOrBlank() || dateOfExpiry.isNullOrBlank()) {
                        setResult(RESULT_CANCELED)
                        finish()
                        return@launch
                    }

                    hasResult = true
                    val data =
                        Intent().apply {
                            putExtra(EXTRA_DOCUMENT_NUMBER, documentNumber)
                            putExtra(EXTRA_DATE_OF_BIRTH, dateOfBirth)
                            putExtra(EXTRA_DATE_OF_EXPIRY, dateOfExpiry)
                        }
                    setResult(RESULT_OK, data)
                    finish()
                } catch (_: CancellationException) {
                    // Ignore: activity is closing.
                } catch (_: Exception) {
                    setResult(RESULT_CANCELED)
                    finish()
                }
            }
    }

    companion object {
        const val EXTRA_DOCUMENT_NUMBER = "documentNumber"
        const val EXTRA_DATE_OF_BIRTH = "dateOfBirth"
        const val EXTRA_DATE_OF_EXPIRY = "dateOfExpiry"
        const val EXTRA_ERROR_CODE = "errorCode"

        private const val REQUEST_CAMERA_PERMISSION = 1101
    }
}

private class MrzViewfinderView(context: android.content.Context) : View(context) {
    private val frameWidthRatio = 0.85f
    private val frameHeightRatio = 0.25f
    private val cornerRadiusDp = 12f
    private val bracketLengthDp = 40f
    private val bracketThicknessDp = 4f
    private val frameBorderDp = 3f

    private var detectionState = MrzDetectionState.NO_TEXT
    private var pulseAlpha = 1f

    private val framePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = dpToPx(frameBorderDp)
        pathEffect = CornerPathEffect(dpToPx(cornerRadiusDp))
    }

    private val bracketPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = dpToPx(bracketThicknessDp)
        strokeCap = Paint.Cap.ROUND
    }

    private val pulseAnimator = ValueAnimator.ofFloat(1f, 0.3f).apply {
        duration = 800
        interpolator = AccelerateDecelerateInterpolator()
        repeatMode = ValueAnimator.REVERSE
        repeatCount = ValueAnimator.INFINITE
        addUpdateListener { animator ->
            pulseAlpha = animator.animatedValue as Float
            if (detectionState == MrzDetectionState.TWO_MRZ_LINES) {
                invalidate()
            }
        }
    }

    fun setDetectionState(state: MrzDetectionState) {
        detectionState = state
        if (state == MrzDetectionState.TWO_MRZ_LINES) {
            if (!pulseAnimator.isRunning) pulseAnimator.start()
        } else {
            pulseAnimator.cancel()
            pulseAlpha = 1f
        }
        invalidate()
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        pulseAnimator.cancel()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        val frameWidth = width * frameWidthRatio
        val frameHeight = height * frameHeightRatio
        val frameLeft = (width - frameWidth) / 2f
        val frameTop = (height - frameHeight) / 2f
        val rect = RectF(frameLeft, frameTop, frameLeft + frameWidth, frameTop + frameHeight)

        val color = getStateColor()
        val alpha = if (detectionState == MrzDetectionState.TWO_MRZ_LINES) pulseAlpha else 1f
        val colorWithAlpha = Color.argb(
            (Color.alpha(color) * alpha).toInt(),
            Color.red(color),
            Color.green(color),
            Color.blue(color),
        )

        framePaint.color = colorWithAlpha
        val cr = dpToPx(cornerRadiusDp)
        canvas.drawRoundRect(rect, cr, cr, framePaint)

        bracketPaint.color = colorWithAlpha
        val bl = dpToPx(bracketLengthDp)
        drawCornerBrackets(canvas, rect, bl)
    }

    private fun getStateColor(): Int =
        when (detectionState) {
            MrzDetectionState.NO_TEXT -> 0xFFEF5350.toInt()
            MrzDetectionState.TEXT_DETECTED -> 0xFFFFA726.toInt()
            MrzDetectionState.ONE_MRZ_LINE -> 0xFFFFEE58.toInt()
            MrzDetectionState.TWO_MRZ_LINES -> 0xFF66BB6A.toInt()
        }

    private fun drawCornerBrackets(canvas: Canvas, rect: RectF, bracketLength: Float) {
        // Top-left
        canvas.drawLine(rect.left, rect.top + bracketLength, rect.left, rect.top, bracketPaint)
        canvas.drawLine(rect.left, rect.top, rect.left + bracketLength, rect.top, bracketPaint)
        // Top-right
        canvas.drawLine(rect.right, rect.top + bracketLength, rect.right, rect.top, bracketPaint)
        canvas.drawLine(rect.right, rect.top, rect.right - bracketLength, rect.top, bracketPaint)
        // Bottom-left
        canvas.drawLine(rect.left, rect.bottom - bracketLength, rect.left, rect.bottom, bracketPaint)
        canvas.drawLine(rect.left, rect.bottom, rect.left + bracketLength, rect.bottom, bracketPaint)
        // Bottom-right
        canvas.drawLine(rect.right, rect.bottom - bracketLength, rect.right, rect.bottom, bracketPaint)
        canvas.drawLine(rect.right, rect.bottom, rect.right - bracketLength, rect.bottom, bracketPaint)
    }

    private fun dpToPx(dp: Float): Float =
        TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, dp, resources.displayMetrics)
}
