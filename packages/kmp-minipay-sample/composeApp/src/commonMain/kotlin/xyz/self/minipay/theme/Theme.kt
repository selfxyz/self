// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.minipay.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors =
    lightColorScheme(
        primary = Color(0xFF1A73E8),
        onPrimary = Color.White,
        primaryContainer = Color(0xFFD2E3FC),
        onPrimaryContainer = Color(0xFF041E49),
        secondary = Color(0xFF5F6368),
        surface = Color(0xFFFAFAFA),
        surfaceVariant = Color(0xFFF1F3F4),
        error = Color(0xFFD93025),
    )

private val DarkColors =
    darkColorScheme(
        primary = Color(0xFF8AB4F8),
        onPrimary = Color(0xFF062E6F),
        primaryContainer = Color(0xFF0842A0),
        onPrimaryContainer = Color(0xFFD2E3FC),
        secondary = Color(0xFF9AA0A6),
        surface = Color(0xFF202124),
        surfaceVariant = Color(0xFF303134),
        error = Color(0xFFF28B82),
    )

@Composable
fun MiniPayTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColors,
        content = content,
    )
}
