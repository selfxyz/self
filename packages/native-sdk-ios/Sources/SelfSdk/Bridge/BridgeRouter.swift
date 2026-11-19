// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation

/// One request a handler works on. Every method is safe to call from any thread.
protocol BridgeCall: AnyObject {
    var requestId: String { get }
    var domain: String { get }
    var method: String { get }
    var params: [String: JSONValue] { get }

    /// Sends an event that carries this request's id. False, and nothing sent, once the request is ending or answered.
    @discardableResult func emit(_ event: String, _ data: [String: JSONValue]) -> Bool
    /// Answers the request. False when it was already answered.
    @discardableResult func succeed(_ data: JSONValue?) -> Bool
    /// Answers the request with the error of `error` (see `bridgeError`). False when it was already answered.
    @discardableResult func fail(_ error: Error) -> Bool
    /// Stops the work and releases the hardware. The router runs it once, on a cancel or a native
    /// timeout, and then waits up to `BridgeMethodRules.stopDeadlineMs` for the handler to answer.
    /// Registered after the request ended, it runs at once. With none, the request ends at once.
    func onStop(_ action: @escaping () -> Void)
}

extension BridgeCall {
    @discardableResult func emit(_ event: String) -> Bool { emit(event, [:]) }
    @discardableResult func succeed() -> Bool { succeed(nil) }
}

typealias BridgeMethodHandler = (BridgeCall) throws -> Void

/// BC 6.2 and 6.4 as data.
enum BridgeMethodRules {
    /// BC 6.3: a cancelled request is answered within this time. A native timeout uses the same limit.
    static let stopDeadlineMs = 2_000
    /// The methods whose timeout native owns, with the default of `params.timeoutMs`. 0 means no timeout.
    static let nativeTimeoutDefaults: [String: Int] = ["nfc.scanPassport": 120_000, "camera.scanMRZ": 0]
    /// A second one of these while one runs in the same domain gets `BUSY`.
    static let exclusive: Set<String> = ["nfc.scanPassport", "camera.scanMRZ"]
}

/// Routes the bridge messages of one page (BC 6, 7). Each request gets exactly one response. `emit`
/// gets the JSON text of each response and event, in order, and must not block.
final class BridgeRouter {
    private let emit: (String) -> Void
    private let clock: BridgeClock
    private let createId: () -> String
    private let lock = NSRecursiveLock()
    private var domains: [String: [String: BridgeMethodHandler]] = [:]
    private var unavailable: [String: BridgeUnsupportedReason] = [:]
    /// In arrival order, so `cancelAll` answers the oldest request first.
    private var pending: [PendingCall] = []

    init(
        emit: @escaping (String) -> Void,
        clock: BridgeClock,
        createId: @escaping () -> String = { UUID().uuidString.lowercased() }
    ) {
        self.emit = emit
        self.clock = clock
        self.createId = createId
    }

    func register(_ domain: String, _ methods: [String: BridgeMethodHandler]) {
        locked {
            unavailable[domain] = nil
            domains[domain] = methods
        }
    }

    /// A domain this build or device can never serve: each request gets `UNSUPPORTED` with `reason`.
    func registerUnavailable(_ domain: String, _ reason: BridgeUnsupportedReason) {
        precondition(reason == .noModule || reason == .noHardware)
        locked {
            domains[domain] = nil
            unavailable[domain] = reason
        }
    }

    /// A message body from a trusted main-frame page.
    func receive(_ body: String) {
        switch EnvelopeCodec.decode(body) {
        case .dropped: break
        case .invalidRequest(let invalid): answerInvalid(invalid)
        case .request(let request): accept(request)
        case .cancel(let cancel): self.cancel(cancel.requestId)
        }
    }

    /// BC 6.3: stops the scan that runs in `domain`, for `nfc.cancelScan` and `camera.stopCamera`.
    func cancelActiveScan(_ domain: String) {
        locked { pending.filter { $0.domain == domain && $0.isExclusive } }.forEach { end($0, .cancelled) }
    }

    /// BC 6.3: the host closed the flow. Every pending request ends with `CANCELLED`.
    func cancelAll() {
        locked { pending }.forEach { end($0, .cancelled) }
    }

    /// BC 6.3, BC-Q36: the page navigated away. Every pending request stops, and nothing more is sent for it.
    func pageChanged() {
        let stops: [() -> Void] = locked {
            defer { pending = [] }
            return pending.compactMap { call in
                call.timer?.cancel()
                call.ending = .cancelled
                call.answered = true
                return call.stopAction
            }
        }
        stops.forEach { $0() }
    }

    private func accept(_ request: BridgeRequest) {
        let accepted: Accepted? = locked {
            if let refusal = refusal(request) {
                send(request.domain, request.id, refusal)
                return nil
            }
            guard let handler = domains[request.domain]?[request.method] else { return nil }
            let isExclusive = BridgeMethodRules.exclusive.contains(request.qualifiedMethod)
            let call = PendingCall(router: self, request: request, isExclusive: isExclusive)
            pending.append(call)
            if let delay = Self.nativeTimeoutMs(request), delay > 0 {
                call.timer = clock.schedule(after: delay) { [weak self, weak call] in
                    if let self, let call { self.end(call, .timeout) }
                }
            }
            let cancelled = request.isDismiss ? pending.filter { $0 !== call } : []
            return Accepted(call: call, handler: handler, cancelled: cancelled)
        }
        guard let accepted else { return }
        accepted.cancelled.forEach { end($0, .cancelled) }
        do {
            try accepted.handler(accepted.call)
        } catch {
            accepted.call.fail(error)
        }
    }

    private struct Accepted {
        let call: PendingCall
        let handler: BridgeMethodHandler
        /// BC 6.3: `lifecycle.dismiss` ends every other pending request first.
        let cancelled: [PendingCall]
    }

    /// The error a request gets before any handler runs, in the order of BC 5.1, 6.4, 7.3.
    private func refusal(_ request: BridgeRequest) -> BridgeError? {
        if request.version != BridgeProtocol.major && !request.isDismiss { return Self.unsupportedVersion }
        if pending.contains(where: { $0.requestId == request.id }) {
            return Self.invalidParams("id", "A request with this id is already pending")
        }
        guard let methods = domains[request.domain] else {
            return Self.unsupported(unavailable[request.domain] ?? .unknownDomain, "No \(request.domain) domain")
        }
        if methods[request.method] == nil {
            return Self.unsupported(.unknownMethod, "No \(request.qualifiedMethod) method")
        }
        let ownsTimeout = BridgeMethodRules.nativeTimeoutDefaults[request.qualifiedMethod] != nil
        if ownsTimeout && Self.nativeTimeoutMs(request) == nil {
            return Self.invalidParams("timeoutMs", "timeoutMs must be a whole number of 0 or more")
        }
        if BridgeMethodRules.exclusive.contains(request.qualifiedMethod)
            && pending.contains(where: { $0.domain == request.domain && $0.isExclusive }) {
            return BridgeError(code: .busy, message: "A scan already runs in \(request.domain)")
        }
        return nil
    }

    private func answerInvalid(_ invalid: InvalidRequest) {
        let dismiss = invalid.domain == BridgeDomain.lifecycle.rawValue && invalid.method == Self.dismiss
        let wrongMajor = invalid.version.map { $0 != BridgeProtocol.major } ?? false
        let error = wrongMajor && !dismiss ? Self.unsupportedVersion : invalid.error
        locked { send(invalid.domain ?? BridgeDomain.lifecycle.rawValue, invalid.requestId, error) }
    }

    private func cancel(_ requestId: String) {
        guard let call = locked({ pending.first { $0.requestId == requestId && $0.ending == nil } }) else { return }
        end(call, .cancelled)
    }

    /// Ends `call` with `code`: the handler gets `BridgeMethodRules.stopDeadlineMs` to stop before the router answers.
    fileprivate func end(_ call: PendingCall, _ code: BridgeErrorCode) {
        let stop: (() -> Void)? = locked {
            guard !call.answered, call.ending == nil else { return nil }
            call.ending = code
            call.timer?.cancel()
            guard let stop = call.stopAction else {
                answer(call, Self.ended(code))
                return nil
            }
            call.timer = clock.schedule(after: BridgeMethodRules.stopDeadlineMs) { [weak self, weak call] in
                if let self, let call { _ = self.locked { self.answerEnding(call) } }
            }
            return stop
        }
        stop?()
    }

    fileprivate func complete(_ call: PendingCall, data: JSONValue?, error: BridgeError?) -> Bool {
        locked {
            if call.answered { return false }
            if call.ending != nil { return answerEnding(call) }
            return answer(call, error, data)
        }
    }

    fileprivate func emitEvent(_ call: PendingCall, _ event: String, _ data: [String: JSONValue]) -> Bool {
        locked {
            guard !call.answered, call.ending == nil else { return false }
            let message = BridgeEvent(
                version: BridgeProtocol.major, id: createId(), domain: call.domain, event: event,
                requestId: call.requestId, data: data, timestamp: now())
            guard let text = try? EnvelopeCodec.encode(message) else { return false }
            emit(text)
            return true
        }
    }

    fileprivate func registerStop(_ call: PendingCall, _ action: @escaping () -> Void) {
        let runNow: Bool = locked {
            guard call.stopAction == nil else { return false }
            call.stopAction = action
            return call.answered && call.ending != nil
        }
        if runNow { action() }
    }

    @discardableResult
    private func answerEnding(_ call: PendingCall) -> Bool {
        guard !call.answered, let code = call.ending else { return false }
        return answer(call, Self.ended(code))
    }

    @discardableResult
    private func answer(_ call: PendingCall, _ error: BridgeError?, _ data: JSONValue? = nil) -> Bool {
        call.answered = true
        call.timer?.cancel()
        pending.removeAll { $0 === call }
        do {
            emit(try EnvelopeCodec.encode(response(call.domain, call.requestId, error, data)))
        } catch {
            let error = BridgeError(code: .internalError, message: "The result is not valid JSON")
            send(call.domain, call.requestId, error)
        }
        return true
    }

    private func send(_ domain: String, _ requestId: String, _ error: BridgeError) {
        // An error response holds no data, so it always encodes.
        if let text = try? EnvelopeCodec.encode(response(domain, requestId, error)) { emit(text) }
    }

    private func response(
        _ domain: String, _ requestId: String, _ error: BridgeError?, _ data: JSONValue? = nil
    ) -> BridgeResponse {
        BridgeResponse(
            version: BridgeProtocol.major, id: createId(), domain: domain, requestId: requestId,
            success: error == nil, data: error == nil ? data : nil, error: error, timestamp: now())
    }

    private func now() -> Double {
        Double(clock.now())
    }

    private func locked<T>(_ body: () throws -> T) rethrows -> T {
        lock.lock()
        defer { lock.unlock() }
        return try body()
    }

    private static let dismiss = "dismiss"

    private static let unsupportedVersion = BridgeError(
        code: .unsupportedVersion,
        message: "Native serves protocol major \(BridgeProtocol.major) only",
        details: BridgeErrorDetails(supported: [BridgeProtocol.major]))

    private static func ended(_ code: BridgeErrorCode) -> BridgeError {
        BridgeError(
            code: code,
            message: code == .timeout ? "The native timeout ended" : "The request was cancelled",
            details: BridgeErrorDetails(origin: .native))
    }

    private static func unsupported(_ reason: BridgeUnsupportedReason, _ message: String) -> BridgeError {
        BridgeError(code: .unsupported, message: message, details: BridgeErrorDetails(reason: reason.rawValue))
    }

    private static func invalidParams(_ field: String, _ message: String) -> BridgeError {
        BridgeError(code: .invalidParams, message: message, details: BridgeErrorDetails(field: field))
    }

    /// BC 6.2: `params.timeoutMs` of a native-owned method, its default when absent, nil when invalid.
    private static func nativeTimeoutMs(_ request: BridgeRequest) -> Int? {
        guard let fallback = BridgeMethodRules.nativeTimeoutDefaults[request.qualifiedMethod] else { return 0 }
        switch request.params["timeoutMs"] {
        case nil, .null?: return fallback
        case .number(let value)?: return JSONText.wholeNumber(value).flatMap { $0 >= 0 ? $0 : nil }
        default: return nil
        }
    }
}

/// The state of one request. Every property is guarded by the router's lock.
private final class PendingCall: BridgeCall {
    private weak var router: BridgeRouter?
    private let request: BridgeRequest
    let isExclusive: Bool
    var timer: BridgeTimer?
    var ending: BridgeErrorCode?
    var answered = false
    var stopAction: (() -> Void)?

    init(router: BridgeRouter, request: BridgeRequest, isExclusive: Bool) {
        self.router = router
        self.request = request
        self.isExclusive = isExclusive
    }

    var requestId: String { request.id }
    var domain: String { request.domain }
    var method: String { request.method }
    var params: [String: JSONValue] { request.params }

    @discardableResult
    func emit(_ event: String, _ data: [String: JSONValue]) -> Bool {
        router?.emitEvent(self, event, data) ?? false
    }

    @discardableResult
    func succeed(_ data: JSONValue?) -> Bool {
        router?.complete(self, data: data, error: nil) ?? false
    }

    @discardableResult
    func fail(_ error: Error) -> Bool {
        router?.complete(self, data: nil, error: error.bridgeError) ?? false
    }

    func onStop(_ action: @escaping () -> Void) {
        router?.registerStop(self, action)
    }
}

extension BridgeRequest {
    fileprivate var qualifiedMethod: String { "\(domain).\(method)" }
    fileprivate var isDismiss: Bool { domain == BridgeDomain.lifecycle.rawValue && method == "dismiss" }
}
