// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.minipay

import xyz.self.sdk.api.SelfSdk
import xyz.self.sdk.api.SelfSdkCallback
import xyz.self.sdk.api.VerificationRequest

/**
 * Platform-specific SDK launch. On Android, [platformContext] must be a FragmentActivity.
 * On iOS, [platformContext] is ignored.
 */
expect fun platformLaunch(
    sdk: SelfSdk,
    request: VerificationRequest,
    callback: SelfSdkCallback,
    platformContext: Any? = null,
)
