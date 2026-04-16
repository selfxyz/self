// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.providers

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.Signature
import java.security.spec.ECGenParameterSpec

internal class AndroidKeystoreCryptoProvider : CryptoProvider {
    private val keyStore: KeyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }

    override fun generateKey(keyRef: String) {
        if (keyStore.containsAlias(keyRef)) {
            keyStore.deleteEntry(keyRef)
        }
        val spec =
            KeyGenParameterSpec
                .Builder(
                    keyRef,
                    KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY,
                ).setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
                .setDigests(KeyProperties.DIGEST_SHA256)
                .build()
        KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, "AndroidKeyStore").apply {
            initialize(spec)
            generateKeyPair()
        }
    }

    override fun getPublicKey(keyRef: String): String? {
        val cert = keyStore.getCertificate(keyRef) ?: return null
        return Base64.encodeToString(cert.publicKey.encoded, Base64.NO_WRAP)
    }

    override fun sign(
        keyRef: String,
        data: String,
    ): String? {
        val privateKey = keyStore.getKey(keyRef, null) ?: return null
        val dataBytes = Base64.decode(data, Base64.DEFAULT)
        val signature =
            Signature
                .getInstance("SHA256withECDSA")
                .apply {
                    initSign(privateKey as java.security.PrivateKey)
                    update(dataBytes)
                }.sign()
        return Base64.encodeToString(signature, Base64.NO_WRAP)
    }

    override fun deleteKey(keyRef: String) {
        if (keyStore.containsAlias(keyRef)) {
            keyStore.deleteEntry(keyRef)
        }
    }
}
