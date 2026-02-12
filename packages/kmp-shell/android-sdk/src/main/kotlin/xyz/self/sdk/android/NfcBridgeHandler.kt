// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.android

import android.app.Activity
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.IsoDep
import android.util.Log
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import net.sf.scuba.smartcards.CardService
import org.jmrtd.BACKey
import org.jmrtd.BACKeySpec
import org.jmrtd.PACEKeySpec
import org.jmrtd.PassportService
import org.jmrtd.lds.CardAccessFile
import org.jmrtd.lds.PACEInfo
import org.jmrtd.lds.SecurityInfo
import org.jmrtd.lds.SODFile
import org.jmrtd.lds.icao.DG1File
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException
import xyz.self.sdk.bridge.MessageRouter
import xyz.self.sdk.nfc.MrzKeyUtils
import xyz.self.sdk.nfc.NfcScanParams
import xyz.self.sdk.nfc.PassportScanResult
import java.io.ByteArrayInputStream
import java.security.MessageDigest
import java.util.Base64
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Bridge handler for NFC passport scanning on Android.
 *
 * Uses JMRTD to read ICAO 9303 e-passports and ID cards via NFC.
 * Supports PACE + BAC fallback authentication, reads DG1 (MRZ),
 * DG2 (facial image), and SOD (security object), then computes
 * hashes and extracts cryptographic material.
 *
 * Uses [NfcAdapter.enableReaderMode] (not foreground dispatch) so
 * it works correctly when embedded as an SDK in a host application.
 *
 * @param activity The activity used for NFC reader mode registration.
 * @param router The [MessageRouter] used to push progress events.
 */
class NfcBridgeHandler(
    private val activity: Activity,
    private val router: MessageRouter,
) : BridgeHandler {

    override val domain = BridgeDomain.NFC

    private var scanJob: Job? = null
    private val json = Json { ignoreUnknownKeys = true }

    override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement? {
        return when (method) {
            "isSupported" -> {
                val adapter = NfcAdapter.getDefaultAdapter(activity)
                buildJsonObject {
                    put("supported", adapter != null && adapter.isEnabled)
                }
            }
            "scan" -> scan(params)
            "cancelScan" -> {
                cancelScan()
                buildJsonObject { put("cancelled", true) }
            }
            else -> throw BridgeHandlerException(
                "UNKNOWN_METHOD",
                "Unknown NFC method: $method",
            )
        }
    }

    private fun cancelScan() {
        try {
            NfcAdapter.getDefaultAdapter(activity)?.disableReaderMode(activity)
        } catch (_: Exception) {
            // Ignore if already disabled
        }
        scanJob?.cancel()
        scanJob = null
    }

    private suspend fun scan(params: Map<String, JsonElement>): JsonElement {
        val scanParams = NfcScanParams(
            passportNumber = params["passportNumber"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_PARAM", "passportNumber required"),
            dateOfBirth = params["dateOfBirth"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_PARAM", "dateOfBirth required"),
            dateOfExpiry = params["dateOfExpiry"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_PARAM", "dateOfExpiry required"),
            canNumber = params["canNumber"]?.jsonPrimitive?.contentOrNull,
            skipPACE = params["skipPACE"]?.jsonPrimitive?.booleanOrNull ?: false,
            skipCA = params["skipCA"]?.jsonPrimitive?.booleanOrNull ?: false,
            sessionId = params["sessionId"]?.jsonPrimitive?.content ?: "",
            useCan = params["useCan"]?.jsonPrimitive?.booleanOrNull ?: false,
        )

        return withContext(Dispatchers.IO) {
            suspendCancellableCoroutine { cont ->
                val nfcAdapter = NfcAdapter.getDefaultAdapter(activity)
                    ?: throw BridgeHandlerException("NFC_NOT_AVAILABLE", "NFC adapter not found")

                if (!nfcAdapter.isEnabled) {
                    throw BridgeHandlerException("NFC_DISABLED", "NFC is disabled")
                }

                pushProgress("waiting_for_tag", 0, "Place document on device")

                nfcAdapter.enableReaderMode(
                    activity,
                    { tag -> onTagDiscovered(tag, scanParams, cont, nfcAdapter) },
                    NfcAdapter.FLAG_READER_NFC_A or
                        NfcAdapter.FLAG_READER_NFC_B or
                        NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK,
                    null,
                )

                cont.invokeOnCancellation {
                    try {
                        nfcAdapter.disableReaderMode(activity)
                    } catch (_: Exception) {
                        // Ignore
                    }
                    scanJob?.cancel()
                }
            }
        }
    }

    private fun onTagDiscovered(
        tag: Tag,
        scanParams: NfcScanParams,
        cont: CancellableContinuation<JsonElement>,
        nfcAdapter: NfcAdapter,
    ) {
        scanJob = CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = readPassport(tag, scanParams)
                val resultJson = json.encodeToJsonElement(
                    PassportScanResult.serializer(),
                    result,
                )
                if (cont.isActive) {
                    cont.resume(resultJson)
                }
            } catch (e: BridgeHandlerException) {
                if (cont.isActive) {
                    cont.resumeWithException(e)
                }
            } catch (e: Exception) {
                if (cont.isActive) {
                    cont.resumeWithException(
                        BridgeHandlerException(
                            "NFC_SCAN_FAILED",
                            e.message ?: "Scan failed",
                        )
                    )
                }
            } finally {
                try {
                    nfcAdapter.disableReaderMode(activity)
                } catch (_: Exception) {
                    // Ignore
                }
            }
        }
    }

    /**
     * Read passport data from an NFC tag using JMRTD.
     *
     * Mirrors the logic from the existing React Native `RNPassportReaderModule`
     * but without any React Native dependencies. Supports PACE with BAC fallback.
     */
    @Suppress("LongMethod")
    private fun readPassport(tag: Tag, params: NfcScanParams): PassportScanResult {
        pushProgress("tag_discovered", 5, "Document detected")

        val isoDep = IsoDep.get(tag)
            ?: throw BridgeHandlerException("NFC_TAG_ERROR", "Not an ISO-DEP tag")
        isoDep.timeout = 20000
        isoDep.connect()

        val cardService = try {
            CardService.getInstance(isoDep)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get CardService instance", e)
            throw BridgeHandlerException("NFC_CARD_SERVICE_FAILED", "Failed to get CardService: ${e.message}")
        }

        try {
            cardService.open()
        } catch (e: Exception) {
            Log.w(TAG, "CardService open failed, retrying", e)
            isoDep.close()
            Thread.sleep(500)
            isoDep.connect()
            cardService.open()
        }

        val service = PassportService(
            cardService,
            PassportService.NORMAL_MAX_TRANCEIVE_LENGTH * 2,
            PassportService.DEFAULT_MAX_BLOCKSIZE * 2,
            false,
            false,
        )
        service.open()

        pushProgress("authenticating", 10, "Authenticating with document")

        // Build BAC key for authentication
        val bacKey = BACKey(
            MrzKeyUtils.padDocumentNumber(params.passportNumber),
            params.dateOfBirth,
            params.dateOfExpiry,
        )

        var paceSucceeded = false
        var bacSucceeded = false

        // Attempt PACE authentication first
        if (!params.skipPACE) {
            paceSucceeded = attemptPace(service, params, bacKey)
        }

        // BAC fallback if PACE failed
        if (!paceSucceeded) {
            bacSucceeded = attemptBac(service, bacKey)
        }

        if (!paceSucceeded && !bacSucceeded) {
            throw BridgeHandlerException(
                "AUTH_FAILED",
                "Neither PACE nor BAC authentication succeeded",
            )
        }

        // Select applet after authentication
        try {
            service.sendSelectApplet(true)
        } catch (e: Exception) {
            val msg = e.message ?: ""
            if (msg.contains("6982") || msg.contains("SECURITY STATUS NOT SATISFIED", ignoreCase = true)) {
                Log.w(TAG, "Select applet returned 6982; proceeding after established auth")
            } else {
                throw BridgeHandlerException("SELECT_APPLET_FAILED", "Select applet failed: ${e.message}")
            }
        }

        // Read DG1 (MRZ)
        pushProgress("reading_dg1", 30, "Reading document data")
        val dg1Bytes = service.getInputStream(PassportService.EF_DG1).readBytes()
        val dg1File = DG1File(ByteArrayInputStream(dg1Bytes))
        val mrz = dg1File.mrzInfo.toString()

        // Read DG2 (Face image)
        pushProgress("reading_dg2", 50, "Reading facial image")
        val dg2Bytes = service.getInputStream(PassportService.EF_DG2).readBytes()

        // Read SOD (Document Security Object)
        pushProgress("reading_sod", 70, "Reading security data")
        val sodBytes = service.getInputStream(PassportService.EF_SOD).readBytes()
        val sodFile = SODFile(ByteArrayInputStream(sodBytes))

        pushProgress("processing", 85, "Processing document data")

        // Compute data group hashes
        val digest = MessageDigest.getInstance(sodFile.digestAlgorithm)
        val dg1Hash = digest.digest(dg1Bytes).map { it.toInt() and 0xFF }

        val digest2 = MessageDigest.getInstance(sodFile.digestAlgorithm)
        val dg2Hash = digest2.digest(dg2Bytes).map { it.toInt() and 0xFF }

        // Extract data group presence from SOD
        val dgHashes = sodFile.dataGroupHashes
        val dgPresents = dgHashes.keys.sorted()

        // Extract signed attributes and signature bytes
        val eContent = sodFile.eContent.map { it.toInt() }
        val encryptedDigest = sodFile.encryptedDigest.map { it.toInt() }

        // Build signed attributes from eContent (the encapsulated content info)
        val signedAttr = eContent

        // Extract Document Signing Certificate in PEM format
        val dscCert = sodFile.docSigningCertificate
        val pemEncoder = Base64.getEncoder()
        val pem = "-----BEGIN CERTIFICATE-----\n" +
            pemEncoder.encodeToString(dscCert.encoded) +
            "\n-----END CERTIFICATE-----"

        pushProgress("complete", 100, "Scan complete")

        val mrzClean = mrz.replace("\n", "")
        val documentType = if (mrzClean.length >= 88) "passport" else "id_card"

        try {
            service.close()
        } catch (_: Exception) {
            // Best-effort close
        }

        return PassportScanResult(
            mrz = mrzClean,
            dsc = pem,
            dg1Hash = dg1Hash,
            dg2Hash = dg2Hash,
            dgPresents = dgPresents,
            eContent = eContent,
            signedAttr = signedAttr,
            encryptedDigest = encryptedDigest,
            documentType = documentType,
            documentCategory = documentType,
        )
    }

    /**
     * Attempt PACE authentication. Returns true if successful.
     */
    private fun attemptPace(
        service: PassportService,
        params: NfcScanParams,
        bacKey: BACKey,
    ): Boolean {
        try {
            val cardAccessFile = CardAccessFile(
                service.getInputStream(PassportService.EF_CARD_ACCESS),
            )
            val securityInfos = cardAccessFile.securityInfos

            for (securityInfo: SecurityInfo in securityInfos) {
                if (securityInfo is PACEInfo) {
                    // Determine PACE key: CAN if provided, otherwise derive from BAC MRZ key
                    val paceKey: PACEKeySpec = if (params.useCan && !params.canNumber.isNullOrEmpty()) {
                        PACEKeySpec.createCANKey(params.canNumber)
                    } else {
                        PACEKeySpec.createMRZKey(bacKey)
                    }

                    try {
                        service.doPACE(
                            paceKey,
                            securityInfo.objectIdentifier,
                            PACEInfo.toParameterSpec(securityInfo.parameterId),
                            null,
                        )
                        Log.d(TAG, "PACE succeeded")
                        pushProgress("pace_succeeded", 15, "PACE authentication succeeded")
                        return true
                    } catch (e: Exception) {
                        Log.w(TAG, "PACE failed for OID: ${securityInfo.objectIdentifier}", e)
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "PACE not available or failed", e)
        }
        return false
    }

    /**
     * Attempt BAC authentication with retries. Returns true if successful.
     */
    private fun attemptBac(
        service: PassportService,
        bacKey: BACKeySpec,
    ): Boolean {
        val maxAttempts = 3

        // Send select applet without secure messaging before BAC
        try {
            service.sendSelectApplet(false)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to send select applet before BAC, proceeding", e)
        }

        for (attempt in 1..maxAttempts) {
            try {
                if (attempt > 1) Thread.sleep(500)

                // Try reading EF_COM first; if it fails, perform BAC
                try {
                    service.getInputStream(PassportService.EF_COM).read()
                } catch (_: Exception) {
                    service.doBAC(bacKey)
                }

                Log.d(TAG, "BAC succeeded on attempt $attempt")
                pushProgress("bac_succeeded", 15, "BAC authentication succeeded")
                return true
            } catch (e: Exception) {
                Log.w(TAG, "BAC attempt $attempt failed: ${e.message}")
                if (attempt == maxAttempts) {
                    Log.e(TAG, "All BAC attempts exhausted")
                }
            }
        }
        return false
    }

    private fun pushProgress(step: String, percent: Int, message: String) {
        router.pushEvent(
            domain = BridgeDomain.NFC,
            event = "scanProgress",
            data = buildJsonObject {
                put("step", step)
                put("percent", percent)
                put("message", message)
            },
        )
    }

    companion object {
        private const val TAG = "NfcBridgeHandler"
    }
}
