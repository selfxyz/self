// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation

/// Constants shared with the KMP SDK layer.
/// Keep in sync with `packages/kmp-sdk/shared/src/commonMain/kotlin/xyz/self/sdk/api/SdkConstants.kt`.
enum SdkConstants {
    static let loopbackHost = "127.0.0.1"
    static let debugPort = 5173
    static let diditHost = "verify.didit.me"
    static let bundledTourPath = "/tunnel/tour/1"
    static let defaultRemoteWebAppBaseURL = "https://self-app-alpha.vercel.app"
}
