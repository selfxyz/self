// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.rnsdk

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.Signature
import java.security.spec.ECGenParameterSpec

/**
 * Native module backing CryptoHandler in @selfxyz/rn-sdk.
 *
 * Algorithm choices intentionally mirror packages/native-shell-android/
 * CryptoHandler.kt so signatures produced under any shell verify identically:
 *   - EC keys, curve secp256r1 (P-256)
 *   - SHA256withECDSA signing
 *   - Public key encoded as X.509 SubjectPublicKeyInfo (cert.publicKey.encoded)
 *   - Base64 NO_WRAP on all transport bytes
 */
class SelfCryptoModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = MODULE_NAME

    private val keyStore: KeyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }

    @ReactMethod
    fun generateKey(keyRef: String, promise: Promise) {
        try {
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

            val result = Arguments.createMap().apply {
                putString("keyRef", keyRef)
            }
            promise.resolve(result)
        } catch (err: Exception) {
            promise.reject("KEYGEN_FAILED", err.message ?: "Key generation failed", err)
        }
    }

    @ReactMethod
    fun getPublicKey(keyRef: String, promise: Promise) {
        try {
            val cert = keyStore.getCertificate(keyRef)
            if (cert == null) {
                promise.reject("KEY_NOT_FOUND", "Key not found: $keyRef")
                return
            }
            val publicKeyB64 = Base64.encodeToString(cert.publicKey.encoded, Base64.NO_WRAP)
            val result = Arguments.createMap().apply {
                putString("publicKey", publicKeyB64)
            }
            promise.resolve(result)
        } catch (err: Exception) {
            promise.reject("PUBKEY_FAILED", err.message ?: "Public key read failed", err)
        }
    }

    @ReactMethod
    fun sign(keyRef: String, dataBase64: String, promise: Promise) {
        try {
            val key = keyStore.getKey(keyRef, null)
            if (key == null) {
                promise.reject("KEY_NOT_FOUND", "Key not found: $keyRef")
                return
            }

            val dataBytes = Base64.decode(dataBase64, Base64.DEFAULT)
            val signatureBytes = Signature.getInstance("SHA256withECDSA").apply {
                initSign(key as PrivateKey)
                update(dataBytes)
            }.sign()

            val signatureB64 = Base64.encodeToString(signatureBytes, Base64.NO_WRAP)
            val result = Arguments.createMap().apply {
                putString("signature", signatureB64)
            }
            promise.resolve(result)
        } catch (err: Exception) {
            promise.reject("SIGN_FAILED", err.message ?: "Signing failed", err)
        }
    }

    companion object {
        const val MODULE_NAME = "SelfCrypto"
    }
}
