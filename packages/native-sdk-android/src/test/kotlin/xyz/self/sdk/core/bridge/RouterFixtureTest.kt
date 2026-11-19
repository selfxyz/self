// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.core.bridge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import xyz.self.sdk.core.bridge.fixtures.FixtureLoader
import xyz.self.sdk.core.bridge.fixtures.FixtureOutcome
import xyz.self.sdk.core.bridge.fixtures.FixtureRunner
import xyz.self.sdk.core.bridge.fixtures.RouterFixtureSubject

/**
 * Runs the fixture groups of the router through it. The Swift library has the same table in
 * `RouterFixtureTests`. Change both together.
 */
class RouterFixtureTest {
    private val groups = listOf("envelope", "envelope-invalid", "cancel", "timeout", "errors", "version")

    /** The step each of these stops at needs a handler of a later step. Every other fixture passes. */
    private val deferred =
        mapOf(
            "envelope/event-request-id-absent" to FixtureOutcome.Deferred(0, "lifecycle.ready needs its handler"),
            "envelope/event-request-id-null" to FixtureOutcome.Deferred(0, "lifecycle.ready needs its handler"),
            "envelope/response-optionals-absent" to FixtureOutcome.Deferred(0, "lifecycle.ready needs its handler"),
            "envelope/response-optionals-null" to FixtureOutcome.Deferred(0, "lifecycle.ready needs its handler"),
            "envelope/request-response-data" to FixtureOutcome.Deferred(0, "nfc.getStatus needs its handler"),
            "version/dismiss-wrong-major" to FixtureOutcome.Deferred(2, "lifecycle.dismiss needs its handler"),
            "version/retry-with-supported-major" to FixtureOutcome.Deferred(2, "lifecycle.getConfig needs its handler"),
            "cancel/dismiss-cancels-pending" to FixtureOutcome.Deferred(1, "lifecycle.dismiss needs its handler"),
        )

    private val fixtures = groups.flatMap(FixtureLoader::group)

    @Test
    fun eachGroupHasFixtures() {
        for (group in groups) {
            assertTrue(group, fixtures.any { it.group == group })
        }
        assertTrue(fixtures.map { it.name }.containsAll(deferred.keys))
    }

    @Test
    fun eachFixtureRunsToTheEndOrStopsWhereALaterHandlerIsNeeded() {
        for (fixture in fixtures) {
            val outcome = FixtureRunner.run(fixture, RouterFixtureSubject(fixture.given))

            assertEquals(fixture.name, deferred[fixture.name] ?: FixtureOutcome.Passed, outcome)
        }
    }
}
