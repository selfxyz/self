// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.testapp.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import xyz.self.sdk.models.NfcScanState

/**
 * Composable that displays NFC scanning progress with visual feedback
 *
 * This component shows:
 * - Animated phone icon with rotation and color changes based on state
 * - Color-coded state feedback:
 *   - Gray (pulsing): Waiting for tag
 *   - Blue: Connecting
 *   - Orange: Authenticating or chip auth
 *   - Primary: Reading data
 *   - Green (pulsing): Complete
 * - Progress percentage
 * - Current step message
 *
 * @param scanState Current NFC scan state (null for initial/idle state)
 * @param modifier Modifier for this composable
 */
@Composable
fun NfcProgressIndicator(
    scanState: NfcScanState?,
    modifier: Modifier = Modifier,
) {
    // Determine icon color and animation based on state
    val targetColor =
        when (scanState) {
            null -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
            NfcScanState.WAITING_FOR_TAG -> Color(0xFF9E9E9E) // Gray 500
            NfcScanState.CONNECTING -> Color(0xFF42A5F5) // Blue 400
            NfcScanState.AUTHENTICATING -> Color(0xFFFFA726) // Orange 400
            NfcScanState.READING_DATA, NfcScanState.READING_SECURITY -> MaterialTheme.colorScheme.primary
            NfcScanState.AUTHENTICATING_CHIP -> Color(0xFFFFA726) // Orange 400
            NfcScanState.FINALIZING -> MaterialTheme.colorScheme.primary
            NfcScanState.COMPLETE -> Color(0xFF66BB6A) // Green 400
        }

    // Add pulsing animation for waiting and complete states
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 0.3f,
        animationSpec =
            infiniteRepeatable(
                animation = tween(1000, easing = FastOutSlowInEasing),
                repeatMode = RepeatMode.Reverse,
            ),
        label = "pulseAlpha",
    )

    val iconColor =
        when (scanState) {
            NfcScanState.WAITING_FOR_TAG, NfcScanState.COMPLETE ->
                targetColor.copy(alpha = pulseAlpha)
            else -> targetColor
        }

    // Rotation animation when actively scanning
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec =
            infiniteRepeatable(
                animation = tween(2000, easing = LinearEasing),
                repeatMode = RepeatMode.Restart,
            ),
        label = "rotation",
    )

    val shouldRotate =
        scanState != null &&
            scanState != NfcScanState.WAITING_FOR_TAG &&
            scanState != NfcScanState.COMPLETE

    // Animate progress percentage smoothly
    val animatedProgress by animateFloatAsState(
        targetValue = (scanState?.percent ?: 0).toFloat(),
        animationSpec = tween(durationMillis = 300, easing = FastOutSlowInEasing),
        label = "progress",
    )

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // Circular indicator with animation (representing NFC scanning)
        Box(
            modifier =
                Modifier
                    .size(120.dp)
                    .rotate(if (shouldRotate) rotation else 0f)
                    .background(iconColor, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "NFC",
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.surface,
            )
        }

        // Progress percentage
        if (scanState != null) {
            Text(
                text = "${animatedProgress.toInt()}%",
                style = MaterialTheme.typography.headlineMedium,
                color = iconColor,
            )
        }

        // Step message
        if (scanState != null) {
            Text(
                text = scanState.message,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurface,
            )
        }
    }
}
