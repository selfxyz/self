// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.core.bridge.fixtures

import xyz.self.sdk.core.bridge.BridgeClock
import xyz.self.sdk.core.bridge.BridgeTimer

/** The fake clock of BC 11.1. Time moves only in [advance]. For one thread. */
internal class ManualClock(
    private var time: Long = FixturePlaceholders.TIMESTAMP.toLong(),
) : BridgeClock {
    private class Entry(
        val due: Long,
        val order: Long,
        val action: () -> Unit,
    ) {
        var cancelled = false
    }

    private val entries = mutableListOf<Entry>()
    private var scheduled = 0L

    /** Timers that are set and have not fired or been cancelled. */
    val activeTimers: Int get() = entries.count { !it.cancelled }

    override fun now(): Long = time

    override fun schedule(
        delayMs: Long,
        action: () -> Unit,
    ): BridgeTimer {
        val entry = Entry(time + delayMs, scheduled++, action)
        entries += entry
        return BridgeTimer { entry.cancelled = true }
    }

    /** Fires each timer that ends within [milliseconds], in time order, at its own time. */
    fun advance(milliseconds: Long) {
        val target = time + milliseconds
        while (true) {
            val next = entries.filter { !it.cancelled && it.due <= target }.minWithOrNull(compareBy({ it.due }, { it.order })) ?: break
            entries.remove(next)
            time = next.due
            next.action()
        }
        entries.removeAll { it.cancelled }
        time = target
    }
}
