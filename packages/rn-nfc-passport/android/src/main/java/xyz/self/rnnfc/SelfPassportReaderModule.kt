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

    // Settle guard for the currently-active scan, hoisted so cancelScan() can settle it. A stale
    // callback from a superseded provider is identified by comparing its captured provider against
    // [provider] (identity), so it never touches a subsequent scan's state.
    @Volatile
    private var activeSettled: AtomicBoolean? = null

    // The active scan's Promise, hoisted so cancelScan() can settle it (reject as cancelled).
    // Cleared on every settle path via [cleanup] so it is never double-settled.
    @Volatile
    private var activePromise: Promise? = null

    override fun getName(): String = MODULE_NAME

    @ReactMethod
    fun scan(options: ReadableMap, promise: Promise) {
        // TODO(RSP follow-up): EU-ID PACE-CAN access requires reader support in self-sdk-native; not wired yet.
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
        activeSettled = settled
        activePromise = promise

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
                    if (provider === nfcProvider && settled.compareAndSet(false, true)) {
                        cleanup(nfcProvider)
                        promise.resolve(json)
                    }
                },
                onError = { message ->
                    if (provider === nfcProvider && settled.compareAndSet(false, true)) {
                        cleanup(nfcProvider)
                        promise.reject("NFC_SCAN_FAILED", message)
                    }
                },
            )
        } catch (err: Throwable) {
            if (provider === nfcProvider && settled.compareAndSet(false, true)) {
                cleanup(nfcProvider)
                promise.reject("NFC_SCAN_FAILED", err.message ?: "NFC scan failed")
            }
        }
    }

    @ReactMethod
    fun cancelScan(promise: Promise) {
        // Settle and tear down only the currently-active scan. Settling before cleanup means a
        // late callback from the cancelled provider is ignored and never touches a later scan.
        val active = provider
        val original = activePromise
        // Only reject the original scan promise if we win the settle race; if a completion/error
        // callback already settled it, the CAS fails and we leave it alone (settle exactly once).
        if (activeSettled?.compareAndSet(false, true) == true) {
            original?.reject("NFC_SCAN_CANCELLED", "NFC scan cancelled")
        }
        active?.cancelScan()
        active?.let { cleanup(it) }
        activePromise = null
        promise.resolve(null)
    }

    private fun cleanup(target: AndroidNfcProvider) {
        // No-op for a superseded provider: only the active scan may close its provider and clear
        // the scanning flag, so a stale callback cannot abort a subsequent scan.
        if (provider !== target) return
        target.close()
        provider = null
        activeSettled = null
        activePromise = null
        scanning.set(false)
    }

    companion object {
        const val MODULE_NAME = "SelfPassportReader"
    }
}
