// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation

@testable import SelfSdk

/// The native code under test, as the WebView sees it: message bodies in, JSON texts out. The codec
/// alone stands behind it for now. The router takes its place with no change to the runner.
protocol FixtureSubject: AnyObject {
    /// A message body from the web, as a trusted main-frame message.
    func send(_ body: String) throws
    /// An action native starts with no message from the web.
    func native(_ action: String) throws
    /// Moves the fake clock forward. Timers that end inside the step fire before this returns.
    func advance(_ milliseconds: Int) throws
    /// The JSON text of each response and event native emitted since the last call, in order.
    func drain() -> [String]
}

/// Thrown by a subject for a step it cannot run yet. The runner reports the fixture as deferred, not as passed.
struct FixtureDeferred: Error, Equatable {
    var why: String
}

enum FixtureOutcome: Equatable {
    /// Native emitted each `expect`, in order, and nothing else.
    case passed
    case failed([String])
    /// The subject could not run the step at `stepIndex`. Nothing after it ran.
    case deferred(stepIndex: Int, why: String)
}

/// Replaces the placeholders of BC 11.1, as `fillPlaceholders` in `packages/bridge-schema` does.
final class FixturePlaceholders {
    static let timestamp = 1_794_650_000_000.0

    private var ids: [String: String] = [:]

    func id(for label: String) -> String {
        if let id = ids[label] { return id }
        let id = UUID().uuidString.lowercased()
        ids[label] = id
        return id
    }

    /// A string `id` or `requestId` is a label. `"timestamp": 0` is replaced. No field is added.
    func fillSend(_ message: JSONFields) -> JSONFields {
        var filled = swapLabel(swapLabel(message, "id"), "requestId")
        if filled["timestamp"] == .number(0) { filled["timestamp"] = .number(Self.timestamp) }
        return filled
    }

    func fillExpect(_ message: JSONFields) -> JSONFields {
        swapLabel(message, "requestId")
    }

    private func swapLabel(_ message: JSONFields, _ field: String) -> JSONFields {
        guard let label = message[field]?.text else { return message }
        var filled = message
        filled[field] = .string(id(for: label))
        return filled
    }
}

/// Compares a message native emitted with an `expect`. BC 11.1 says a runner compares the listed
/// fields and ignores the message's own `id`, its `timestamp` and `error.message`. The rest is this
/// runner's rule, the same in the Kotlin library:
/// - Only the fields of the contract are compared. An `expect` can hold a field the contract does
///   not know, as input for the web runner. Native is not required to emit it.
/// - `null` in an `expect` means native emits no value: the field is absent or `null`.
/// - `data` must be equal as a whole. Of `error`, the `code` and each listed key of `details`.
enum FixtureMatcher {
    private static let comparedFields = [
        "response": ["type", "version", "domain", "requestId", "success", "data", "error"],
        "event": ["type", "version", "domain", "event", "requestId", "data"]
    ]

    static func mismatches(_ expected: JSONFields, actualText: String) -> [String] {
        guard let actual = (try? JSONText.parse(actualText))?.fields else {
            return ["native emitted text that is not a JSON object"]
        }
        let type = expected["type"]?.text ?? "nil"
        guard let fields = comparedFields[type] else {
            return ["an expect must be a response or an event, not \(type)"]
        }
        return fields.filter { expected[$0] != nil }.flatMap { field in
            field == "error"
                ? errorMismatches(expected[field] ?? .null, actual[field] ?? .null)
                : mismatch(field, expected[field] ?? .null, actual[field] ?? .null)
        }
    }

    private static func errorMismatches(_ expected: JSONValue, _ actual: JSONValue) -> [String] {
        guard let expectedError = expected.fields else { return mismatch("error", expected, actual) }
        guard let actualError = actual.fields else { return ["error: expected an object, got \(text(actual))"] }
        let expectedDetails = expectedError["details"]?.fields ?? [:]
        let actualDetails = actualError["details"]?.fields ?? [:]
        return mismatch("error.code", expectedError["code"] ?? .null, actualError["code"] ?? .null)
            + expectedDetails.keys.sorted().flatMap {
                mismatch("error.details.\($0)", expectedDetails[$0] ?? .null, actualDetails[$0] ?? .null)
            }
    }

    private static func mismatch(_ place: String, _ expected: JSONValue, _ actual: JSONValue) -> [String] {
        expected == actual ? [] : ["\(place): expected \(text(expected)), got \(text(actual))"]
    }

    private static func text(_ value: JSONValue) -> String {
        (try? JSONText.write(value)) ?? "a value with no JSON text"
    }
}

/// Runs one fixture against a subject, as BC 11.2 says for the Swift and Kotlin libraries.
enum FixtureRunner {
    static func run(_ fixture: Fixture, _ subject: FixtureSubject) throws -> FixtureOutcome {
        let placeholders = FixturePlaceholders()
        var emitted: [String] = []
        var problems: [String] = []
        for (index, step) in fixture.steps.enumerated() {
            do {
                switch step {
                case .send(let message): try subject.send(try JSONText.write(.object(placeholders.fillSend(message))))
                case .sendRaw(let body): try subject.send(body)
                case .native(let action): try subject.native(action)
                case .advance(let milliseconds): try subject.advance(milliseconds)
                case .expect: break
                }
            } catch let deferred as FixtureDeferred {
                return problems.isEmpty ? .deferred(stepIndex: index, why: deferred.why) : .failed(problems)
            }
            emitted += subject.drain()
            guard case .expect(let message) = step else { continue }
            if emitted.isEmpty {
                problems.append("steps[\(index)]: native emitted nothing")
            } else {
                let actual = emitted.removeFirst()
                problems += FixtureMatcher.mismatches(placeholders.fillExpect(message), actualText: actual)
                    .map { "steps[\(index)]: \($0)" }
            }
        }
        problems += emitted.map { "native emitted a message that no step expects: \($0)" }
        return problems.isEmpty ? .passed : .failed(problems)
    }
}
