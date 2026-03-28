// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.handlers

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonPrimitive
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.Signature
import java.security.spec.ECGenParameterSpec

class CryptoHandler : BridgeHandler {
    override val domain = BridgeDomain.CRYPTO

    private val keyStore: KeyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }

    override suspend fun handle(
        method: String,
        params: Map<String, JsonElement>,
    ): JsonElement? = when (method) {
        "generateKey" -> generateKey(params)
        "getPublicKey" -> getPublicKey(params)
        "sign" -> sign(params)
        else -> throw BridgeHandlerException("METHOD_NOT_FOUND", "Unknown crypto method: $method")
    }

    private fun generateKey(params: Map<String, JsonElement>): JsonElement {
        val keyRef = params["keyRef"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_PARAM", "keyRef parameter required")

        // Delete existing key if present
        if (keyStore.containsAlias(keyRef)) {
            keyStore.deleteEntry(keyRef)
        }

        val spec = KeyGenParameterSpec.Builder(
            keyRef,
            KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY,
        )
            .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
            .setDigests(KeyProperties.DIGEST_SHA256)
            .build()

        KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, "AndroidKeyStore").apply {
            initialize(spec)
            generateKeyPair()
        }

        return JsonObject(mapOf(
            "keyRef" to JsonPrimitive(keyRef),
            "success" to JsonPrimitive(true),
        ))
    }

    private fun getPublicKey(params: Map<String, JsonElement>): JsonElement {
        val keyRef = params["keyRef"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_PARAM", "keyRef parameter required")

        val cert = keyStore.getCertificate(keyRef)
            ?: throw BridgeHandlerException("KEY_NOT_FOUND", "Key not found: $keyRef")

        val publicKeyBytes = cert.publicKey.encoded
        val publicKeyB64 = Base64.encodeToString(publicKeyBytes, Base64.NO_WRAP)

        return JsonObject(mapOf("publicKey" to JsonPrimitive(publicKeyB64)))
    }

    private fun sign(params: Map<String, JsonElement>): JsonElement {
        val keyRef = params["keyRef"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_PARAM", "keyRef parameter required")
        val dataB64 = params["data"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_PARAM", "data parameter required")

        val privateKey = keyStore.getKey(keyRef, null)
            ?: throw BridgeHandlerException("KEY_NOT_FOUND", "Key not found: $keyRef")

        val dataBytes = Base64.decode(dataB64, Base64.DEFAULT)

        val signature = Signature.getInstance("SHA256withECDSA").apply {
            initSign(privateKey as java.security.PrivateKey)
            update(dataBytes)
        }.sign()

        val signatureB64 = Base64.encodeToString(signature, Base64.NO_WRAP)

        return JsonObject(mapOf("signature" to JsonPrimitive(signatureB64)))
    }
}
