// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.api

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class QueryParamsBuilderTest {
    private val defaultConfig = SelfSdkConfig()
    private val minimalRequest = VerificationRequest()

    @Test
    fun `builds params with default config and minimal request`() {
        val result = QueryParamsBuilder.build(defaultConfig, minimalRequest)
        assertNotNull(result)
        assertTrue(result.contains("endpoint=https%3A%2F%2Fapi.self.xyz") || result.contains("endpoint=https://api.self.xyz"))
        assertTrue(result.contains("environment=prod"))
        assertTrue(result.contains("version=1"))
    }

    @Test
    fun `includes all config params`() {
        val config = SelfSdkConfig(
            endpoint = "https://custom.api.xyz",
            environment = SelfEnvironment.STG,
            version = 2,
            appName = "TestApp",
            appEndpoint = "https://app.endpoint.xyz",
            endpointType = "custom",
            chainID = 42,
        )
        val result = QueryParamsBuilder.build(config, minimalRequest)
        assertNotNull(result)
        assertTrue(result.contains("appName=TestApp"))
        assertTrue(result.contains("endpointType=custom"))
        assertTrue(result.contains("chainID=42"))
        assertTrue(result.contains("environment=stg"))
        assertTrue(result.contains("version=2"))
    }

    @Test
    fun `appEndpoint falls back to endpoint when null`() {
        val config = SelfSdkConfig(endpoint = "https://api.self.xyz", appEndpoint = null)
        val result = QueryParamsBuilder.build(config, minimalRequest)
        assertNotNull(result)
        val params = result.split("&").associate {
            val (k, v) = it.split("=", limit = 2)
            k to v
        }
        assertEquals(params["endpoint"], params["appEndpoint"])
    }

    @Test
    fun `includes all request params`() {
        val request = VerificationRequest(
            userId = "user-123",
            scope = "identity",
            verificationId = "ver-456",
            resultType = "json",
            userIdType = "email",
            userDefinedData = "custom-data",
            selfDefinedData = "self-data",
        )
        val result = QueryParamsBuilder.build(defaultConfig, request)
        assertNotNull(result)
        assertTrue(result.contains("userId=user-123"))
        assertTrue(result.contains("scope=identity"))
        assertTrue(result.contains("verificationId=ver-456"))
        assertTrue(result.contains("resultType=json"))
        assertTrue(result.contains("userIdType=email"))
        assertTrue(result.contains("userDefinedData=custom-data"))
        assertTrue(result.contains("selfDefinedData=self-data"))
    }

    @Test
    fun `disclosures are comma-joined`() {
        val request = VerificationRequest(disclosures = listOf("name", "dob", "nationality"))
        val result = QueryParamsBuilder.build(defaultConfig, request)
        assertNotNull(result)
        assertTrue(result.contains("disclosures=name%2Cdob%2Cnationality") || result.contains("disclosures=name,dob,nationality"))
    }

    @Test
    fun `excludedCountries are comma-joined`() {
        val request = VerificationRequest(excludedCountries = listOf("US", "GB"))
        val result = QueryParamsBuilder.build(defaultConfig, request)
        assertNotNull(result)
        assertTrue(result.contains("excludedCountries=US%2CGB") || result.contains("excludedCountries=US,GB"))
    }

    @Test
    fun `empty lists are omitted`() {
        val request = VerificationRequest(disclosures = emptyList(), excludedCountries = emptyList())
        val result = QueryParamsBuilder.build(defaultConfig, request)
        assertNotNull(result)
        assertTrue(!result.contains("disclosures"))
        assertTrue(!result.contains("excludedCountries"))
    }

    @Test
    fun `null optional fields are omitted`() {
        val result = QueryParamsBuilder.build(defaultConfig, minimalRequest)
        assertNotNull(result)
        assertTrue(!result.contains("userId="))
        assertTrue(!result.contains("appName="))
        assertTrue(!result.contains("chainID="))
    }

    @Test
    fun `urlEncode encodes special characters`() {
        assertEquals("hello%20world", urlEncode("hello world"))
        assertEquals("a%26b", urlEncode("a&b"))
        assertEquals("a%3Db", urlEncode("a=b"))
        assertEquals("a%2Bb", urlEncode("a+b"))
        assertEquals("a%25b", urlEncode("a%b"))
        assertEquals("a%23b", urlEncode("a#b"))
    }

    @Test
    fun `urlEncode preserves safe characters`() {
        assertEquals("hello-world_123", urlEncode("hello-world_123"))
        assertEquals("abc/def", urlEncode("abc/def"))
    }
}
