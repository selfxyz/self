// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.handlers

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class LifecycleResultEnvelopeTest {

    @Test
    fun `extractPayload unwraps nested result object`() {
        val inner = buildJsonObject { put("success", true); put("data", "value") }
        val params = mapOf("result" to inner, "extra" to JsonPrimitive("ignored"))

        val payload = LifecycleResultEnvelope.extractPayload(params)

        assertEquals(inner, payload)
    }

    @Test
    fun `extractPayload falls back to wrapping params when result is missing`() {
        val params = mapOf("success" to JsonPrimitive(false), "error" to JsonPrimitive("oops"))

        val payload = LifecycleResultEnvelope.extractPayload(params)

        assertEquals(JsonObject(params), payload)
    }

    @Test
    fun `extractPayload falls back to wrapping params when result is not a JsonObject`() {
        val params = mapOf("result" to JsonPrimitive("not-an-object"), "success" to JsonPrimitive(true))

        val payload = LifecycleResultEnvelope.extractPayload(params)

        assertEquals(JsonObject(params), payload)
    }

    @Test
    fun `extractSuccess returns true when success is true`() {
        val payload = buildJsonObject { put("success", true) }

        assertTrue(LifecycleResultEnvelope.extractSuccess(payload))
    }

    @Test
    fun `extractSuccess returns false when success is false`() {
        val payload = buildJsonObject { put("success", false) }

        assertFalse(LifecycleResultEnvelope.extractSuccess(payload))
    }

    @Test
    fun `extractSuccess returns false when success field is missing`() {
        val payload = buildJsonObject { put("data", "value") }

        assertFalse(LifecycleResultEnvelope.extractSuccess(payload))
    }

    @Test
    fun `extractSuccess returns false when success is not a boolean`() {
        val payload = buildJsonObject { put("success", "yes") }

        assertFalse(LifecycleResultEnvelope.extractSuccess(payload))
    }

    @Test
    fun `extractSuccess returns false for empty payload`() {
        val payload = buildJsonObject {}

        assertFalse(LifecycleResultEnvelope.extractSuccess(payload))
    }
}
