// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.testapp.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import xyz.self.sdk.models.MrzDetectionState

/**
 * Composable that displays an MRZ scanning viewfinder overlay with dynamic color feedback
 *
 * This component draws a rectangular scanning frame that changes color based on detection state:
 * - Red: No text detected - position passport in frame
 * - Yellow: Text detected but no MRZ - move closer
 * - Orange: One MRZ line detected - almost there
 * - Green (pulsing): Both MRZ lines detected - reading
 *
 * @param modifier Modifier for this composable
 * @param detectionState Current MRZ detection state (affects frame color)
 * @param frameWidthRatio Width of the scanning frame as a ratio of screen width (default: 0.85)
 * @param frameHeightRatio Height of the scanning frame as a ratio of screen height (default: 0.25)
 * @param cornerRadius Corner radius for rounded frame edges (default: 12dp)
 */
@Composable
fun MrzViewfinder(
    modifier: Modifier = Modifier,
    detectionState: MrzDetectionState? = null,
    frameWidthRatio: Float = 0.85f,
    frameHeightRatio: Float = 0.25f,
    cornerRadius: Float = 12f,
) {
    // Determine frame color based on detection state
    val targetColor =
        when (detectionState) {
            null, MrzDetectionState.NO_TEXT -> Color(0xFFEF5350) // Red 400
            MrzDetectionState.TEXT_DETECTED -> Color(0xFFFFA726) // Orange 400
            MrzDetectionState.ONE_MRZ_LINE -> Color(0xFFFFEE58) // Yellow 400
            MrzDetectionState.TWO_MRZ_LINES -> Color(0xFF66BB6A) // Green 400
        }

    // Add pulsing animation when TWO_MRZ_LINES detected
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 0.3f,
        animationSpec =
            infiniteRepeatable(
                animation = tween(800, easing = FastOutSlowInEasing),
                repeatMode = RepeatMode.Reverse,
            ),
        label = "pulseAlpha",
    )

    val frameColor =
        if (detectionState == MrzDetectionState.TWO_MRZ_LINES) {
            targetColor.copy(alpha = pulseAlpha)
        } else {
            targetColor
        }
    Canvas(modifier = modifier.fillMaxSize()) {
        val canvasWidth = size.width
        val canvasHeight = size.height

        // Calculate frame dimensions and position
        val frameWidth = canvasWidth * frameWidthRatio
        val frameHeight = canvasHeight * frameHeightRatio
        val frameLeft = (canvasWidth - frameWidth) / 2f
        val frameTop = (canvasHeight - frameHeight) / 2f

        val scanningRect =
            Rect(
                left = frameLeft,
                top = frameTop,
                right = frameLeft + frameWidth,
                bottom = frameTop + frameHeight,
            )

        // Note: Dark overlay removed for better visibility
        // Users can see the camera feed clearly with just the frame guide

        // Draw frame border
        drawFrameBorder(
            scanningRect = scanningRect,
            frameColor = frameColor,
            cornerRadius = cornerRadius,
            strokeWidth = 3.dp.toPx(),
        )

        // Draw corner brackets for enhanced guidance
        drawCornerBrackets(
            scanningRect = scanningRect,
            frameColor = frameColor,
            bracketLength = 40.dp.toPx(),
            bracketThickness = 4.dp.toPx(),
        )
    }
}

/**
 * Draws a semi-transparent overlay covering the entire canvas with a clear cutout
 * for the scanning area
 */
private fun DrawScope.drawOverlayWithCutout(
    scanningRect: Rect,
    overlayColor: Color,
    cornerRadius: Float,
) {
    val overlayPath =
        Path().apply {
            // Add the entire canvas as a rectangle
            addRect(Rect(0f, 0f, size.width, size.height))

            // Subtract the scanning area (cutout)
            addRoundRect(
                RoundRect(
                    rect = scanningRect,
                    cornerRadius = CornerRadius(cornerRadius, cornerRadius),
                ),
            )
        }

    // Use even-odd fill rule to create the cutout effect
    drawPath(
        path = overlayPath,
        color = overlayColor,
    )
}

/**
 * Draws a rectangular border around the scanning frame
 */
private fun DrawScope.drawFrameBorder(
    scanningRect: Rect,
    frameColor: Color,
    cornerRadius: Float,
    strokeWidth: Float,
) {
    drawRoundRect(
        color = frameColor,
        topLeft = Offset(scanningRect.left, scanningRect.top),
        size = Size(scanningRect.width, scanningRect.height),
        cornerRadius = CornerRadius(cornerRadius, cornerRadius),
        style = Stroke(width = strokeWidth),
    )
}

/**
 * Draws corner brackets at each corner of the scanning frame for enhanced visual guidance
 */
private fun DrawScope.drawCornerBrackets(
    scanningRect: Rect,
    frameColor: Color,
    bracketLength: Float,
    bracketThickness: Float,
) {
    val bracketStroke =
        Stroke(
            width = bracketThickness,
            cap = androidx.compose.ui.graphics.StrokeCap.Round,
        )

    // Top-left corner
    drawLine(
        color = frameColor,
        start = Offset(scanningRect.left, scanningRect.top + bracketLength),
        end = Offset(scanningRect.left, scanningRect.top),
        strokeWidth = bracketThickness,
        cap = androidx.compose.ui.graphics.StrokeCap.Round,
    )
    drawLine(
        color = frameColor,
        start = Offset(scanningRect.left, scanningRect.top),
        end = Offset(scanningRect.left + bracketLength, scanningRect.top),
        strokeWidth = bracketThickness,
        cap = androidx.compose.ui.graphics.StrokeCap.Round,
    )

    // Top-right corner
    drawLine(
        color = frameColor,
        start = Offset(scanningRect.right, scanningRect.top + bracketLength),
        end = Offset(scanningRect.right, scanningRect.top),
        strokeWidth = bracketThickness,
        cap = androidx.compose.ui.graphics.StrokeCap.Round,
    )
    drawLine(
        color = frameColor,
        start = Offset(scanningRect.right, scanningRect.top),
        end = Offset(scanningRect.right - bracketLength, scanningRect.top),
        strokeWidth = bracketThickness,
        cap = androidx.compose.ui.graphics.StrokeCap.Round,
    )

    // Bottom-left corner
    drawLine(
        color = frameColor,
        start = Offset(scanningRect.left, scanningRect.bottom - bracketLength),
        end = Offset(scanningRect.left, scanningRect.bottom),
        strokeWidth = bracketThickness,
        cap = androidx.compose.ui.graphics.StrokeCap.Round,
    )
    drawLine(
        color = frameColor,
        start = Offset(scanningRect.left, scanningRect.bottom),
        end = Offset(scanningRect.left + bracketLength, scanningRect.bottom),
        strokeWidth = bracketThickness,
        cap = androidx.compose.ui.graphics.StrokeCap.Round,
    )

    // Bottom-right corner
    drawLine(
        color = frameColor,
        start = Offset(scanningRect.right, scanningRect.bottom - bracketLength),
        end = Offset(scanningRect.right, scanningRect.bottom),
        strokeWidth = bracketThickness,
        cap = androidx.compose.ui.graphics.StrokeCap.Round,
    )
    drawLine(
        color = frameColor,
        start = Offset(scanningRect.right, scanningRect.bottom),
        end = Offset(scanningRect.right - bracketLength, scanningRect.bottom),
        strokeWidth = bracketThickness,
        cap = androidx.compose.ui.graphics.StrokeCap.Round,
    )
}
