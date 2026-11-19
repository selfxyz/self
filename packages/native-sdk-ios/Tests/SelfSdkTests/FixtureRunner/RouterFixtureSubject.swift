// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

@testable import SelfSdk

/// The router with fake handlers set up from `given`. The domains and methods are those of the
/// capability setup, read from its handshake fixture. Each method is one of:
/// - A fake from `given.provider`: emits `progress` with the domain's first event name, then fails
///   with the `fail` cause, or never finishes and stops when the router asks.
/// - `nfc.cancelScan` or `camera.stopCamera`: stops the scan of its domain and succeeds (BC 6.3).
/// - Any other: deferred, because its handler does not exist yet.
final class RouterFixtureSubject: FixtureSubject {
    private static let stopMethods: Set = ["nfc.cancelScan", "camera.stopCamera"]

    private let clock = ManualClock()
    private var emitted: [String] = []
    private var router: BridgeRouter!
    private var deferred: String?

    init(_ given: FixtureGiven) throws {
        router = BridgeRouter(emit: { [unowned self] in emitted.append($0) }, clock: clock)
        for (domain, entry) in try Self.capabilityEntries(given.capabilities) {
            if entry["available"] == .bool(true) {
                let events = (entry["events"]?.items ?? []).compactMap(\.text)
                let methods = (entry["methods"]?.items ?? []).compactMap(\.text)
                router.register(domain, Dictionary(uniqueKeysWithValues: methods.map { method in
                    (method, handler(domain, method, given.provider["\(domain).\(method)"], events.first))
                }))
            } else {
                let reason = try Self.unavailableReason(entry["reason"]?.text)
                router.registerUnavailable(domain, reason)
            }
        }
    }

    func send(_ body: String) throws {
        router.receive(body)
        if let deferred { throw FixtureDeferred(why: deferred) }
    }

    func native(_ action: String) throws {
        throw FixtureDeferred(why: "the native action \(action) needs its handler")
    }

    func advance(_ milliseconds: Int) throws {
        clock.advance(milliseconds)
    }

    func drain() -> [String] {
        defer { emitted = [] }
        return emitted
    }

    private func handler(
        _ domain: String, _ method: String, _ setup: JSONFields?, _ event: String?
    ) -> BridgeMethodHandler {
        if let setup, setup["fail"] != nil || setup["pending"] != nil {
            return { [unowned self] call in try fake(call, setup, event) }
        }
        if Self.stopMethods.contains("\(domain).\(method)") {
            return { [unowned self] call in
                router.cancelActiveScan(domain)
                call.succeed()
            }
        }
        return { [unowned self] _ in deferred = "\(domain).\(method) needs its handler" }
    }

    private func fake(_ call: BridgeCall, _ setup: JSONFields, _ event: String?) throws {
        for item in setup["progress"]?.items ?? [] {
            call.emit(event ?? "", item.fields ?? [:])
        }
        guard let cause = setup["fail"]?.text else {
            call.onStop { call.fail(FakeError.stopped) }
            return
        }
        switch cause {
        case "unexpected_exception":
            throw FakeError.broke
        case "user_cancelled":
            call.fail(Self.failure(.userCancelled))
        case "permission_denied":
            call.fail(Self.failure(.permissionDenied, BridgeErrorDetails(permission: call.domain, canAskAgain: true)))
        default:
            guard let failure = BridgeFailure.forReason(cause, message: "The fake failed") else {
                preconditionFailure("No fail cause \(cause)")
            }
            call.fail(failure)
        }
    }

    private static func failure(_ code: BridgeErrorCode, _ details: BridgeErrorDetails? = nil) -> BridgeFailure {
        // swiftlint:disable:next force_unwrapping
        BridgeFailure(BridgeError(code: code, message: "The fake failed", details: details))!
    }

    private enum FakeError: Error {
        case stopped
        case broke
    }

    private struct SetupError: Error {
        var message: String
    }

    private static func unavailableReason(_ text: String?) throws -> BridgeUnsupportedReason {
        guard let reason = text.flatMap(BridgeUnsupportedReason.init(rawValue:)) else {
            throw SetupError(message: "An unavailable capability entry needs a reason")
        }
        return reason
    }

    /// The capability entries of a setup: the data of the successful answer in `handshake/<setup>`.
    static func capabilityEntries(_ setup: String) throws -> [String: JSONFields] {
        let name = "handshake/" + setup.replacingOccurrences(of: "_", with: "-")
        guard let fixture = try FixtureLoader.group("handshake").first(where: { $0.name == name }) else {
            throw SetupError(message: "No fixture \(name)")
        }
        let answers: [JSONFields] = fixture.steps.compactMap {
            guard case .expect(let message) = $0, message["success"] == .bool(true) else { return nil }
            return message
        }
        guard answers.count == 1, let capabilities = answers[0]["data"]?.fields?["capabilities"]?.fields else {
            throw SetupError(message: "\(name) has no one successful answer")
        }
        return capabilities.compactMapValues(\.fields)
    }
}
