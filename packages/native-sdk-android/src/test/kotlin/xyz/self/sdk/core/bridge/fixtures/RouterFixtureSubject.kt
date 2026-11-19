// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.core.bridge.fixtures

import xyz.self.sdk.core.bridge.BridgeCall
import xyz.self.sdk.core.bridge.BridgeFailure
import xyz.self.sdk.core.bridge.BridgeMethodHandler
import xyz.self.sdk.core.bridge.BridgeRouter
import xyz.self.sdk.core.bridge.JsonArray
import xyz.self.sdk.core.bridge.JsonBool
import xyz.self.sdk.core.bridge.JsonObject
import xyz.self.sdk.core.bridge.JsonString
import xyz.self.sdk.core.bridge.generated.BridgeError
import xyz.self.sdk.core.bridge.generated.BridgeErrorCode
import xyz.self.sdk.core.bridge.generated.BridgeErrorDetails
import xyz.self.sdk.core.bridge.generated.BridgeUnsupportedReason

/**
 * The router with fake handlers set up from `given`. The domains and methods are those of the
 * capability setup, read from its handshake fixture. Each method is one of:
 * - A fake from `given.provider`: emits `progress` with the domain's first event name, then fails
 *   with the `fail` cause, or never finishes and stops when the router asks.
 * - `nfc.cancelScan` or `camera.stopCamera`: stops the scan of its domain and succeeds (BC 6.3).
 * - Any other: deferred, because its handler does not exist yet.
 */
internal class RouterFixtureSubject(
    given: FixtureGiven,
) : FixtureSubject {
    private val clock = ManualClock()
    private val emitted = mutableListOf<String>()
    private val router = BridgeRouter(emitted::add, clock)
    private var deferred: String? = null

    init {
        for ((domain, entry) in capabilityEntries(given.capabilities)) {
            if ((entry["available"] as JsonBool).value) {
                val events = (entry["events"] as JsonArray).items.map { (it as JsonString).value }
                val methods = (entry["methods"] as JsonArray).items.map { (it as JsonString).value }
                router.register(domain, methods.associateWith { handler(domain, it, given.provider["$domain.$it"], events.firstOrNull()) })
            } else {
                router.registerUnavailable(domain, BridgeUnsupportedReason.fromWire((entry["reason"] as JsonString).value)!!)
            }
        }
    }

    override fun send(body: String) {
        router.receive(body)
        deferred?.let { throw FixtureDeferredException(it) }
    }

    override fun native(action: String): Unit = throw FixtureDeferredException("the native action $action needs its handler")

    override fun advance(milliseconds: Long) = clock.advance(milliseconds)

    override fun drain(): List<String> = emitted.toList().also { emitted.clear() }

    private fun handler(
        domain: String,
        method: String,
        setup: JsonFields?,
        event: String?,
    ): BridgeMethodHandler =
        when {
            setup != null && ("fail" in setup || "pending" in setup) -> BridgeMethodHandler { fake(it, setup, event) }
            "$domain.$method" in STOP_METHODS ->
                BridgeMethodHandler {
                    router.cancelActiveScan(domain)
                    it.succeed()
                }
            else -> BridgeMethodHandler { deferred = "$domain.$method needs its handler" }
        }

    private fun fake(
        call: BridgeCall,
        setup: JsonFields,
        event: String?,
    ) {
        (setup["progress"] as? JsonArray)?.items?.forEach { call.emit(event!!, (it as JsonObject).members) }
        val cause = (setup["fail"] as? JsonString)?.value
        if (cause == null) {
            call.onStop { call.fail(IllegalStateException("The fake stopped")) }
            return
        }
        when (cause) {
            "unexpected_exception" -> throw IllegalStateException("The fake hardware broke")
            "user_cancelled" -> call.fail(failure(BridgeErrorCode.USER_CANCELLED))
            "permission_denied" ->
                call.fail(
                    failure(BridgeErrorCode.PERMISSION_DENIED, BridgeErrorDetails(permission = call.domain, canAskAgain = true)),
                )
            else -> call.fail(BridgeFailure.forReason(cause, "The fake failed") ?: throw AssertionError("No fail cause $cause"))
        }
    }

    private fun failure(
        code: BridgeErrorCode,
        details: BridgeErrorDetails? = null,
    ) = BridgeFailure(BridgeError(code, "The fake failed", details))

    companion object {
        private val STOP_METHODS = setOf("nfc.cancelScan", "camera.stopCamera")
        private val handshakes by lazy { FixtureLoader.group("handshake") }

        /** The capability entries of a setup: the data of the successful answer in `handshake/<setup>`. */
        fun capabilityEntries(setup: String): Map<String, JsonFields> {
            val fixture = handshakes.single { it.name == "handshake/" + setup.replace('_', '-') }
            val answer =
                fixture.steps
                    .filterIsInstance<FixtureStep.Expect>()
                    .map { it.message }
                    .single { it["success"] == JsonBool(true) }
            val capabilities = ((answer["data"] as JsonObject).members["capabilities"] as JsonObject).members
            return capabilities.mapValues { (it.value as JsonObject).members }
        }
    }
}
