// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.rnnfc

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import java.util.concurrent.atomic.AtomicBoolean
import xyz.self.sdk.nfc.AndroidNfcProvider

/**
 * Native module backing NfcHandler's `scanPassport` path in @selfxyz/rn-sdk.
 *
 * Delegates the ICAO 9303 chip read to the maintained NFC reader in the
 * `xyz.self.sdk:nfc` AAR (jMRTD / BouncyCastle / SCUBA), shared with the KMP SDK.
 * The reader returns the WebView document contract as a JSON string, which this
 * module resolves verbatim so the schema is not duplicated in the shim.
 *
 * No passport-derived fields (document number, dates, CAN, MRZ, chip data) are ever
 * logged or forwarded to analytics from this shim.
 */
class SelfPassportReaderModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val scanning = AtomicBoolean(false)

    @Volatile
    private var provider: AndroidNfcProvider? = null

    override fun getName(): String = MODULE_NAME

    @ReactMethod
    fun scan(options: ReadableMap, promise: Promise) {
        val documentNumber = options.getString("documentNumber")
        val dateOfBirth = options.getString("dateOfBirth")
        val dateOfExpiry = options.getString("dateOfExpiry")
        if (documentNumber.isNullOrEmpty() || dateOfBirth.isNullOrEmpty() || dateOfExpiry.isNullOrEmpty()) {
            promise.reject(
                "INVALID_PARAMS",
                "scan requires documentNumber, dateOfBirth and dateOfExpiry",
            )
            return
        }

        val activity = reactContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No foreground activity available for the NFC scan")
            return
        }

        if (!scanning.compareAndSet(false, true)) {
            promise.reject("ALREADY_SCANNING", "An NFC scan is already in progress")
            return
        }

        val settled = AtomicBoolean(false)
        val nfcProvider = AndroidNfcProvider(activity)
        provider = nfcProvider

        try {
            // Advanced BAC/PACE toggles (canNumber, skipPACE, skipCA, extendedMode,
            // usePacePolling) are not yet surfaced by the AAR's provider API; the reader
            // negotiates PACE→BAC automatically. They are accepted for signature
            // compatibility with NfcHandler and forwarded once the AAR exposes them.
            nfcProvider.scanPassport(
                passportNumber = documentNumber,
                dateOfBirth = dateOfBirth,
                dateOfExpiry = dateOfExpiry,
                onProgress = { /* state ordinal only; no PII to forward */ },
                onComplete = { json ->
                    if (settled.compareAndSet(false, true)) {
                        cleanup()
                        promise.resolve(json)
                    }
                },
                onError = { message ->
                    if (settled.compareAndSet(false, true)) {
                        cleanup()
                        promise.reject("NFC_SCAN_FAILED", message)
                    }
                },
            )
        } catch (err: Throwable) {
            if (settled.compareAndSet(false, true)) {
                cleanup()
                promise.reject("NFC_SCAN_FAILED", err.message ?: "NFC scan failed")
            }
        }
    }

    @ReactMethod
    fun cancelScan(promise: Promise) {
        provider?.cancelScan()
        cleanup()
        promise.resolve(null)
    }

    private fun cleanup() {
        provider?.close()
        provider = null
        scanning.set(false)
    }

    companion object {
        const val MODULE_NAME = "SelfPassportReader"
    }
}
