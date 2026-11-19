// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation

@testable import SelfSdk

typealias JSONFields = [String: JSONValue]

extension JSONValue {
    var fields: JSONFields? {
        guard case .object(let members) = self else { return nil }
        return members
    }

    var items: [JSONValue]? {
        guard case .array(let items) = self else { return nil }
        return items
    }

    var text: String? {
        guard case .string(let string) = self else { return nil }
        return string
    }

    var nonEmptyText: String? { text.flatMap { $0.isEmpty ? nil : $0 } }
}

/// One conformance fixture (BC 11.1). The format is in the README of `packages/bridge-schema`.
struct Fixture: Equatable {
    var name: String
    var given: FixtureGiven
    var steps: [FixtureStep]

    var group: String { String(name.prefix { $0 != "/" }) }
}

struct FixtureGiven: Equatable {
    var capabilities: String
    /// What the fake hardware does, keyed by `<domain>.<method>`. Each entry has passed the format check.
    var provider: [String: JSONFields] = [:]
    var launch: JSONFields?
}

enum FixtureStep: Equatable {
    case send(JSONFields)
    /// A body that is not a JSON object.
    case sendRaw(String)
    case expect(JSONFields)
    case native(String)
    case advance(Int)
}

struct FixtureFormatError: Error, Equatable {
    var message: String
}

/// Reads a fixture by the rules of `parseFixture` in `packages/bridge-schema/src/fixture.ts`.
struct FixtureParser {
    private static let stepKinds = "must hold exactly one of send, expect, native, advance"
    private static let launchKeysNativeOwns = ["protocolVersion", "protocolMinor", "capabilities"]

    let source: String

    static func parse(_ value: JSONValue, source: String) throws -> Fixture {
        try FixtureParser(source: source).fixture(value)
    }

    private func fail(_ place: String, _ problem: String) -> FixtureFormatError {
        FixtureFormatError(message: "\(source): \(place) \(problem)")
    }

    private func matches(_ text: String, _ pattern: String) -> Bool {
        text.range(of: "^(?:\(pattern))$", options: .regularExpression) != nil
    }

    private func rejectUnknownKeys(_ fields: JSONFields, _ place: String, _ allowed: [String]) throws {
        if let key = fields.keys.sorted().first(where: { !allowed.contains($0) }) {
            throw fail(place, "has the unknown key \"\(key)\"")
        }
    }

    private func fixture(_ value: JSONValue) throws -> Fixture {
        guard let fields = value.fields else { throw fail("a fixture", "must be a JSON object") }
        try rejectUnknownKeys(fields, "the fixture", ["name", "given", "steps"])
        guard let name = fields["name"]?.text, matches(name, "[A-Za-z][A-Za-z0-9-]*/[a-z0-9][a-z0-9-]*") else {
            throw fail("name", "must be \"<group>/<case>\"")
        }
        let given = try given(fields["given"])
        guard let steps = fields["steps"]?.items, !steps.isEmpty else {
            throw fail("steps", "must be a non-empty list")
        }
        return Fixture(name: name, given: given, steps: try steps.enumerated().map { try step($1, index: $0) })
    }

    private func given(_ value: JSONValue?) throws -> FixtureGiven {
        guard let fields = value?.fields else { throw fail("given", "must be an object") }
        try rejectUnknownKeys(fields, "given", ["capabilities", "provider", "launch"])
        guard let capabilities = fields["capabilities"]?.nonEmptyText else {
            throw fail("given.capabilities", "must be a non-empty string")
        }
        var given = FixtureGiven(capabilities: capabilities)
        if let provider = fields["provider"] { given.provider = try self.provider(provider) }
        if let launch = fields["launch"] {
            guard let launchFields = launch.fields else { throw fail("given.launch", "must be an object") }
            if let key = Self.launchKeysNativeOwns.first(where: { launchFields[$0] != nil }) {
                throw fail("given.launch", "cannot set \"\(key)\": it comes from the build and given.capabilities")
            }
            given.launch = launchFields
        }
        return given
    }

    private func provider(_ value: JSONValue) throws -> [String: JSONFields] {
        guard let entries = value.fields else { throw fail("given.provider", "must be an object") }
        var provider: [String: JSONFields] = [:]
        for (method, setupValue) in entries {
            let place = "given.provider[\"\(method)\"]"
            guard matches(method, "[A-Za-z][A-Za-z0-9]*\\.[A-Za-z][A-Za-z0-9]*") else {
                throw fail(place, "must be keyed by \"<domain>.<method>\"")
            }
            guard let setup = setupValue.fields else { throw fail(place, "must be an object") }
            try checkSetup(setup, place)
            provider[method] = setup
        }
        return provider
    }

    private func checkSetup(_ setup: JSONFields, _ place: String) throws {
        try rejectUnknownKeys(setup, place, ["fail", "progress", "pending"])
        if setup.isEmpty { throw fail(place, "must say what the fake does") }
        if let cause = setup["fail"], cause.nonEmptyText == nil {
            throw fail("\(place).fail", "must be a non-empty string")
        }
        if let progress = setup["progress"] {
            guard let items = progress.items, items.allSatisfy({ $0.fields != nil }) else {
                throw fail("\(place).progress", "must be a list of objects")
            }
        }
        if let pending = setup["pending"], pending != .bool(true) {
            throw fail("\(place).pending", "must be true when present")
        }
        if setup["pending"] != nil, setup["fail"] != nil { throw fail(place, "cannot both fail and never finish") }
    }

    private func step(_ value: JSONValue, index: Int) throws -> FixtureStep {
        let place = "steps[\(index)]"
        guard let fields = value.fields, fields.count == 1, let (kind, content) = fields.first else {
            throw fail(place, Self.stepKinds)
        }
        switch kind {
        case "send":
            if let message = content.fields { return .send(message) }
            if let body = content.text { return .sendRaw(body) }
            throw fail("\(place).send", "must be an object or a string")
        case "expect":
            guard let message = content.fields else { throw fail("\(place).expect", "must be an object") }
            return .expect(message)
        case "native":
            guard let action = content.nonEmptyText else { throw fail("\(place).native", "must be a non-empty string") }
            return .native(action)
        case "advance":
            return .advance(try milliseconds(content, "\(place).advance"))
        default:
            throw fail(place, Self.stepKinds)
        }
    }

    private func milliseconds(_ value: JSONValue, _ place: String) throws -> Int {
        guard case .number(let number) = value, let milliseconds = JSONText.wholeNumber(number), milliseconds >= 1
        else { throw fail(place, "must be an integer number of milliseconds, 1 or more") }
        return milliseconds
    }
}

/// Reads the fixture copies that `packages/bridge-schema` writes into the test resources.
enum FixtureLoader {
    /// Every fixture, group by group. Throws for a file that is misplaced or does not have the fixture shape.
    static func loadAll() throws -> [Fixture] {
        guard let root = Bundle.module.url(forResource: "Fixtures", withExtension: nil)?.resolvingSymlinksInPath(),
            let found = FileManager.default.enumerator(at: root, includingPropertiesForKeys: [.isRegularFileKey])
        else { throw FixtureFormatError(message: "No Fixtures directory in the test resources") }
        let urls: [URL] = found.compactMap { $0 as? URL }
            .map { $0.resolvingSymlinksInPath() }
            .filter { (try? $0.resourceValues(forKeys: [.isRegularFileKey]).isRegularFile) == true }
            .filter { !$0.lastPathComponent.hasPrefix(".") }
        let name = { (file: URL) -> String in String(file.deletingPathExtension().path.dropFirst(root.path.count + 1)) }
        let files = urls.sorted { name($0) < name($1) }
        return try files.map { file in
            let expectedName = name(file)
            let content = try JSONText.parse(String(contentsOf: file, encoding: .utf8))
            let fixture = try FixtureParser.parse(content, source: file.path)
            guard fixture.name == expectedName, file.pathExtension == "json" else {
                let problem = "name must be \"\(expectedName)\", the path of the file"
                throw FixtureFormatError(message: "\(file.path): \(problem)")
            }
            return fixture
        }
    }

    static func group(_ name: String) throws -> [Fixture] {
        try loadAll().filter { $0.group == name }
    }
}
