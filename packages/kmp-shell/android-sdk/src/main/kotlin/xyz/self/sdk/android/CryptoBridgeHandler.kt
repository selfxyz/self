// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.android

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.util.Base64

/**
 * Bridge handler for cryptographic operations on Android.
 *
 * Uses the Android Keystore to generate EC key pairs (secp256r1) and
 * sign data with SHA256withECDSA. Private keys never leave the hardware
 * security module.
 *
 * Supports methods: "sign", "generateKey", "getPublicKey".
 */
class CryptoBridgeHandler : BridgeHandler {

    override val domain = BridgeDomain.CRYPTO

    override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement? {
        return when (method) {
            "sign" -> sign(params)
            "generateKey" -> generateKey(params)
            "getPublicKey" -> getPublicKey(params)
            else -> throw BridgeHandlerException(
                "UNKNOWN_METHOD",
                "Unknown crypto method: $method",
            )
        }
    }

    private fun sign(params: Map<String, JsonElement>): JsonElement {
        val data = params["data"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_PARAM", "data is required")
        val keyRef = params["keyRef"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_PARAM", "keyRef is required")

        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        val privateKey = keyStore.getKey(keyRef, null) as? PrivateKey
            ?: throw BridgeHandlerException("KEY_NOT_FOUND", "Key not found: $keyRef")

        val signature = Signature.getInstance(SIGNATURE_ALGORITHM).apply {
            initSign(privateKey)
            update(Base64.getDecoder().decode(data))
        }

        val sig = signature.sign()
        return buildJsonObject {
            put("signature", Base64.getEncoder().encodeToString(sig))
        }
    }

    private fun generateKey(params: Map<String, JsonElement>): JsonElement {
        val keyRef = params["keyRef"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_PARAM", "keyRef is required")

        val keyPairGenerator = KeyPairGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_EC,
            ANDROID_KEYSTORE,
        )

        keyPairGenerator.initialize(
            KeyGenParameterSpec.Builder(keyRef, KeyProperties.PURPOSE_SIGN)
                .setAlgorithmParameterSpec(ECGenParameterSpec(EC_CURVE))
                .setDigests(KeyProperties.DIGEST_SHA256)
                .setUserAuthenticationRequired(false)
                .build()
        )

        val keyPair = keyPairGenerator.generateKeyPair()
        val publicKeyBytes = keyPair.public.encoded

        return buildJsonObject {
            put("publicKey", Base64.getEncoder().encodeToString(publicKeyBytes))
            put("keyRef", keyRef)
        }
    }

    private fun getPublicKey(params: Map<String, JsonElement>): JsonElement {
        val keyRef = params["keyRef"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_PARAM", "keyRef is required")

        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        val cert = keyStore.getCertificate(keyRef)
            ?: throw BridgeHandlerException("KEY_NOT_FOUND", "Key not found: $keyRef")

        return buildJsonObject {
            put("publicKey", Base64.getEncoder().encodeToString(cert.publicKey.encoded))
        }
    }

    companion object {
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val SIGNATURE_ALGORITHM = "SHA256withECDSA"
        private const val EC_CURVE = "secp256r1"
    }
}
