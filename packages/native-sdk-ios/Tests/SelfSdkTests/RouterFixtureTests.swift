// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import XCTest

@testable import SelfSdk

/// Runs the fixture groups of the router through it. The Kotlin library has the same table in
/// `RouterFixtureTest`. Change both together.
final class RouterFixtureTests: XCTestCase {
    private let groups = ["envelope", "envelope-invalid", "cancel", "timeout", "errors", "version"]

    /// The step each of these stops at needs a handler of a later step. Every other fixture passes.
    private let deferred: [String: FixtureOutcome] = [
        "envelope/event-request-id-absent": .deferred(stepIndex: 0, why: "lifecycle.ready needs its handler"),
        "envelope/event-request-id-null": .deferred(stepIndex: 0, why: "lifecycle.ready needs its handler"),
        "envelope/response-optionals-absent": .deferred(stepIndex: 0, why: "lifecycle.ready needs its handler"),
        "envelope/response-optionals-null": .deferred(stepIndex: 0, why: "lifecycle.ready needs its handler"),
        "envelope/request-response-data": .deferred(stepIndex: 0, why: "nfc.getStatus needs its handler"),
        "version/dismiss-wrong-major": .deferred(stepIndex: 2, why: "lifecycle.dismiss needs its handler"),
        "version/retry-with-supported-major": .deferred(stepIndex: 2, why: "lifecycle.getConfig needs its handler"),
        "cancel/dismiss-cancels-pending": .deferred(stepIndex: 1, why: "lifecycle.dismiss needs its handler")
    ]

    private func fixtures() throws -> [Fixture] {
        try groups.flatMap(FixtureLoader.group)
    }

    func testEachGroupHasFixtures() throws {
        let fixtures = try fixtures()
        for group in groups {
            XCTAssertTrue(fixtures.contains { $0.group == group }, group)
        }
        XCTAssertTrue(Set(deferred.keys).isSubset(of: fixtures.map(\.name)))
    }

    func testEachFixtureRunsToTheEndOrStopsWhereALaterHandlerIsNeeded() throws {
        for fixture in try fixtures() {
            let outcome = try FixtureRunner.run(fixture, try RouterFixtureSubject(fixture.given))

            XCTAssertEqual(outcome, deferred[fixture.name] ?? .passed, fixture.name)
        }
    }
}
