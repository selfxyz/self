// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.core.bridge

import java.util.concurrent.ScheduledThreadPoolExecutor
import java.util.concurrent.TimeUnit

/** The time source of the router: message timestamps and the timers of BC 6.2 and 6.3. Tests use a fake. */
internal interface BridgeClock {
    /** Milliseconds since the Unix epoch. */
    fun now(): Long

    /** Runs [action] once after [delayMs], on any thread, unless the timer is cancelled first. */
    fun schedule(
        delayMs: Long,
        action: () -> Unit,
    ): BridgeTimer
}

internal fun interface BridgeTimer {
    fun cancel()
}

internal class SystemBridgeClock : BridgeClock {
    private val executor =
        ScheduledThreadPoolExecutor(1) { runnable -> Thread(runnable, "self-bridge-timer").apply { isDaemon = true } }
            .apply { removeOnCancelPolicy = true }

    override fun now(): Long = System.currentTimeMillis()

    override fun schedule(
        delayMs: Long,
        action: () -> Unit,
    ): BridgeTimer {
        val future = executor.schedule(action, delayMs, TimeUnit.MILLISECONDS)
        return BridgeTimer { future.cancel(false) }
    }
}
