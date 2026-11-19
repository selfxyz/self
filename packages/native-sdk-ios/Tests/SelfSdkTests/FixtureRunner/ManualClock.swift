// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

@testable import SelfSdk

/// The fake clock of BC 11.1. Time moves only in `advance`. For one thread.
final class ManualClock: BridgeClock {
    private final class Entry: BridgeTimer {
        let due: Int
        let order: Int
        let action: () -> Void
        var cancelled = false

        init(due: Int, order: Int, action: @escaping () -> Void) {
            self.due = due
            self.order = order
            self.action = action
        }

        func cancel() {
            cancelled = true
        }
    }

    private var time: Int
    private var entries: [Entry] = []
    private var scheduled = 0

    init(time: Int = Int(FixturePlaceholders.timestamp)) {
        self.time = time
    }

    /// Timers that are set and have not fired or been cancelled.
    var activeTimers: Int { entries.filter { !$0.cancelled }.count }

    func now() -> Int {
        time
    }

    func schedule(after delayMs: Int, _ action: @escaping () -> Void) -> BridgeTimer {
        let entry = Entry(due: time + delayMs, order: scheduled, action: action)
        scheduled += 1
        entries.append(entry)
        return entry
    }

    /// Fires each timer that ends within `milliseconds`, in time order, at its own time.
    func advance(_ milliseconds: Int) {
        let target = time + milliseconds
        while let next = entries
            .filter({ !$0.cancelled && $0.due <= target })
            .min(by: { ($0.due, $0.order) < ($1.due, $1.order) }) {
            entries.removeAll { $0 === next }
            time = next.due
            next.action()
        }
        entries.removeAll { $0.cancelled }
        time = target
    }
}
