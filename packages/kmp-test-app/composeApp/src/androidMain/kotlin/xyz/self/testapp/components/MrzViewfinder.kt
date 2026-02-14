package xyz.self.testapp.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
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

/**
 * Composable that displays an MRZ scanning viewfinder overlay
 *
 * This component draws a semi-transparent overlay with a clear rectangular
 * scanning area to guide users when positioning their passport for MRZ scanning.
 *
 * Design specifications:
 * - Frame width: 85% of screen width
 * - Frame height: 25% of screen height
 * - Vertically centered
 * - Corner brackets for enhanced visual guidance
 *
 * @param modifier Modifier for this composable
 * @param frameColor Color of the frame border and corner brackets (default: Green)
 * @param overlayColor Color of the semi-transparent overlay outside the scanning area (default: Black with 60% opacity)
 * @param frameWidthRatio Width of the scanning frame as a ratio of screen width (default: 0.85)
 * @param frameHeightRatio Height of the scanning frame as a ratio of screen height (default: 0.25)
 * @param cornerRadius Corner radius for rounded frame edges (default: 12dp)
 */
@Composable
fun MrzViewfinder(
    modifier: Modifier = Modifier,
    frameColor: Color = Color(0xFF4CAF50), // Material Green 500
    overlayColor: Color = Color.Black.copy(alpha = 0.6f),
    frameWidthRatio: Float = 0.85f,
    frameHeightRatio: Float = 0.25f,
    cornerRadius: Float = 12f,
) {
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

        // Draw semi-transparent overlay with cutout for scanning area
        drawOverlayWithCutout(
            scanningRect = scanningRect,
            overlayColor = overlayColor,
            cornerRadius = cornerRadius,
        )

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
