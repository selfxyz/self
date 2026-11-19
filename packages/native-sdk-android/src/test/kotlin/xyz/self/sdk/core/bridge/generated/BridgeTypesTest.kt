// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.core.bridge.generated

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import xyz.self.sdk.core.bridge.JsonObject
import xyz.self.sdk.core.bridge.JsonString

class BridgeTypesTest {
    @Test
    fun protocolIsMajorTwo() {
        assertEquals(2L, BridgeProtocol.MAJOR)
        assertEquals(0L, BridgeProtocol.MINOR)
    }

    @Test
    fun enumsCarryTheWireNames() {
        assertEquals(8, BridgeDomain.entries.size)
        assertEquals(11, BridgeErrorCode.entries.size)
        assertEquals("secureStorage", BridgeDomain.SECURE_STORAGE.wire)
        assertEquals("react-native", BridgeWrapper.REACT_NATIVE.wire)
        assertEquals("self-app", BridgeMode.SELF_APP.wire)
        assertEquals(
            listOf("request", "response", "event", "cancel"),
            BridgeMessageType.entries.map { it.wire },
        )
    }

    @Test
    fun fromWireFindsAKnownNameAndRejectsAnUnknownOne() {
        assertEquals(BridgeErrorCode.UNSUPPORTED_VERSION, BridgeErrorCode.fromWire("UNSUPPORTED_VERSION"))
        assertEquals(BridgeUserPresence.NONE, BridgeUserPresence.fromWire("none"))
        assertNull(BridgeDomain.fromWire("crypto"))
        assertNull(BridgeErrorCode.fromWire("unsupported_version"))
    }

    @Test
    fun onlyThreeCodesTakeAReason() {
        val withReasons = BridgeErrorCode.entries.filter { it.allowedReasons.isNotEmpty() }

        assertEquals(
            listOf(BridgeErrorCode.UNSUPPORTED, BridgeErrorCode.UNAVAILABLE, BridgeErrorCode.FAILED),
            withReasons,
        )
        assertTrue("unknown_method" in BridgeErrorCode.UNSUPPORTED.allowedReasons)
        assertTrue("nfc_disabled" in BridgeErrorCode.UNAVAILABLE.allowedReasons)
        assertTrue("tag_lost" in BridgeErrorCode.FAILED.allowedReasons)
    }

    @Test
    fun optionalFieldsDefaultToNull() {
        val response =
            BridgeResponse(
                version = BridgeProtocol.MAJOR,
                id = "a",
                domain = BridgeDomain.LIFECYCLE.wire,
                requestId = "b",
                success = true,
                timestamp = 0.0,
            )
        val capability = BridgeCapability(available = true, methods = listOf("getConfig"), events = emptyList())

        assertNull(response.data)
        assertNull(response.error)
        assertNull(capability.reason)
        assertNull(capability.features)
    }

    @Test
    fun aRequestHoldsUntypedParams() {
        val request =
            BridgeRequest(
                version = BridgeProtocol.MAJOR,
                id = "a",
                domain = "secureStorage",
                method = "get",
                params = mapOf("key" to JsonString("self_mnemonic")),
                timestamp = 0.0,
            )

        assertEquals(JsonObject(request.params), JsonObject(mapOf("key" to JsonString("self_mnemonic"))))
    }
}
