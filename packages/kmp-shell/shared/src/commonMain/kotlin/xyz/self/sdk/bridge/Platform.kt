// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.bridge

/**
 * Platform detection for conditional behavior.
 */
enum class Platform {
    ANDROID,
    IOS,
}

/**
 * Returns the current platform. Implemented via expect/actual.
 */
expect fun currentPlatform(): Platform
