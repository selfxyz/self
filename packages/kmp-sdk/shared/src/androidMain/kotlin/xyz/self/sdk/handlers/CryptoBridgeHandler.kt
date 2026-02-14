package xyz.self.sdk.handlers

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.Signature
import java.security.spec.ECGenParameterSpec

/**
 * Android implementation of cryptographic operations bridge handler.
 * Uses Android Keystore for secure key storage and cryptographic operations.
 */
class CryptoBridgeHandler : BridgeHandler {

    override val domain = BridgeDomain.CRYPTO

    private val keyStore: KeyStore = KeyStore.getInstance("AndroidKeyStore").apply {
        load(null)
    }

    override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement? {
        return when (method) {
            "sign" -> sign(params)
            "generateKey" -> generateKey(params)
            "getPublicKey" -> getPublicKey(params)
            "deleteKey" -> deleteKey(params)
            else -> throw BridgeHandlerException(
                "METHOD_NOT_FOUND",
                "Unknown crypto method: $method"
            )
        }
    }

    /**
     * Signs data using a private key from Android Keystore.
     * Uses SHA256withECDSA signature algorithm.
     */
    private fun sign(params: Map<String, JsonElement>): JsonElement {
        val dataBase64 = params["data"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_DATA", "Data parameter required")

        val keyRef = params["keyRef"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_KEY_REF", "keyRef parameter required")

        // Decode base64 data
        val data = try {
            Base64.decode(dataBase64, Base64.NO_WRAP)
        } catch (e: Exception) {
            throw BridgeHandlerException("INVALID_DATA", "Data must be valid base64", mapOf())
        }

        // Load private key from keystore
        val entry = keyStore.getEntry(keyRef, null) as? KeyStore.PrivateKeyEntry
            ?: throw BridgeHandlerException("KEY_NOT_FOUND", "Key not found: $keyRef")

        // Sign the data
        val signature = Signature.getInstance("SHA256withECDSA")
        signature.initSign(entry.privateKey)
        signature.update(data)
        val signed = signature.sign()

        return buildJsonObject {
            put("signature", Base64.encodeToString(signed, Base64.NO_WRAP))
        }
    }

    /**
     * Generates a new EC key pair in Android Keystore.
     * Uses secp256r1 (P-256) curve.
     */
    private fun generateKey(params: Map<String, JsonElement>): JsonElement {
        val keyRef = params["keyRef"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_KEY_REF", "keyRef parameter required")

        val requireBiometric = params["requireBiometric"]?.jsonPrimitive?.content?.toBoolean() ?: false

        // Check if key already exists
        if (keyStore.containsAlias(keyRef)) {
            throw BridgeHandlerException(
                "KEY_ALREADY_EXISTS",
                "Key already exists: $keyRef"
            )
        }

        // Create key generation spec
        val builder = KeyGenParameterSpec.Builder(
            keyRef,
            KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
        )
            .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
            .setDigests(KeyProperties.DIGEST_SHA256, KeyProperties.DIGEST_SHA512)

        // Require biometric authentication if requested
        if (requireBiometric) {
            builder.setUserAuthenticationRequired(true)
            // Authenticate for each use of the key
            builder.setUserAuthenticationValidityDurationSeconds(-1)
        }

        val spec = builder.build()

        // Generate key pair
        val keyPairGenerator = KeyPairGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_EC,
            "AndroidKeyStore"
        )
        keyPairGenerator.initialize(spec)
        keyPairGenerator.generateKeyPair()

        return buildJsonObject {
            put("keyRef", keyRef)
            put("success", true)
        }
    }

    /**
     * Retrieves the public key for a given key reference.
     * Returns the public key in base64-encoded DER format.
     */
    private fun getPublicKey(params: Map<String, JsonElement>): JsonElement {
        val keyRef = params["keyRef"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_KEY_REF", "keyRef parameter required")

        // Load key entry
        val entry = keyStore.getEntry(keyRef, null) as? KeyStore.PrivateKeyEntry
            ?: throw BridgeHandlerException("KEY_NOT_FOUND", "Key not found: $keyRef")

        // Get public key in DER format
        val publicKeyBytes = entry.certificate.publicKey.encoded
        val publicKeyBase64 = Base64.encodeToString(publicKeyBytes, Base64.NO_WRAP)

        return buildJsonObject {
            put("publicKey", publicKeyBase64)
        }
    }

    /**
     * Deletes a key from Android Keystore.
     */
    private fun deleteKey(params: Map<String, JsonElement>): JsonElement? {
        val keyRef = params["keyRef"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_KEY_REF", "keyRef parameter required")

        if (!keyStore.containsAlias(keyRef)) {
            throw BridgeHandlerException("KEY_NOT_FOUND", "Key not found: $keyRef")
        }

        keyStore.deleteEntry(keyRef)

        return null // Success with no return value
    }
}
