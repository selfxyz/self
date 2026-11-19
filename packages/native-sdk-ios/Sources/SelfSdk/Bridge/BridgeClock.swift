// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation

/// The time source of the router: message timestamps and the timers of BC 6.2 and 6.3. Tests use a fake.
protocol BridgeClock: AnyObject {
    /// Milliseconds since the Unix epoch.
    func now() -> Int
    /// Runs `action` once after `delayMs`, on any thread, unless the timer is cancelled first.
    func schedule(after delayMs: Int, _ action: @escaping () -> Void) -> BridgeTimer
}

protocol BridgeTimer {
    func cancel()
}

final class SystemBridgeClock: BridgeClock {
    private let queue = DispatchQueue(label: "xyz.self.sdk.bridge-timer")

    func now() -> Int {
        Int(Date().timeIntervalSince1970 * 1000)
    }

    func schedule(after delayMs: Int, _ action: @escaping () -> Void) -> BridgeTimer {
        let item = DispatchWorkItem(block: action)
        queue.asyncAfter(deadline: .now() + .milliseconds(delayMs), execute: item)
        return DispatchTimer(item: item)
    }

    private struct DispatchTimer: BridgeTimer {
        let item: DispatchWorkItem

        func cancel() {
            item.cancel()
        }
    }
}
