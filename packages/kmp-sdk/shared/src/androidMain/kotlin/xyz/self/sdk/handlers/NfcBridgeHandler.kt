package xyz.self.sdk.handlers

import android.app.Activity
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.IsoDep
import android.util.Base64
import android.util.Log
import kotlinx.coroutines.delay
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import net.sf.scuba.smartcards.CardService
import org.apache.commons.io.IOUtils
import org.bouncycastle.asn1.cms.SignedData
import org.bouncycastle.asn1.icao.LDSSecurityObject
import org.jmrtd.BACKey
import org.jmrtd.BACKeySpec
import org.jmrtd.PACEKeySpec
import org.jmrtd.PassportService
import org.jmrtd.lds.CardAccessFile
import org.jmrtd.lds.ChipAuthenticationPublicKeyInfo
import org.jmrtd.lds.PACEInfo
import org.jmrtd.lds.SODFile
import org.jmrtd.lds.SecurityInfo
import org.jmrtd.lds.icao.DG14File
import org.jmrtd.lds.icao.DG1File
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException
import xyz.self.sdk.bridge.MessageRouter
import xyz.self.sdk.models.NfcScanParams
import xyz.self.sdk.models.NfcScanProgress
import xyz.self.sdk.models.NfcScanState
import java.io.ByteArrayInputStream
import java.security.interfaces.RSAPublicKey
import kotlin.coroutines.resume

class NfcBridgeHandler(
    private val activity: Activity,
    private val router: MessageRouter,
) : BridgeHandler {
    override val domain = BridgeDomain.NFC

    private val json = Json { ignoreUnknownKeys = true }
    private var pendingTagContinuation: (suspend (Tag) -> Unit)? = null
    private var progressCallback: ((NfcScanState) -> Unit)? = null

    override suspend fun handle(
        method: String,
        params: Map<String, JsonElement>,
    ): JsonElement? =
        when (method) {
            "scan" -> scan(params)
            "cancelScan" -> cancelScan()
            "isSupported" -> isSupported()
            else -> throw BridgeHandlerException("METHOD_NOT_FOUND", "Unknown NFC method: $method")
        }

    private fun isSupported(): JsonElement {
        val adapter = NfcAdapter.getDefaultAdapter(activity)
        return JsonPrimitive(adapter != null && adapter.isEnabled)
    }

    private fun cancelScan(): JsonElement? {
        disableReaderMode()
        return null
    }

    fun scan(scanParams: NfcScanParams): JsonElement {
        // This is the synchronous version that takes parsed params directly.
        // For bridge calls, the suspend version below is used.
        throw BridgeHandlerException("USE_SUSPEND", "Use the suspend scan method")
    }

    private suspend fun scan(params: Map<String, JsonElement>): JsonElement {
        val scanParams = json.decodeFromJsonElement(NfcScanParams.serializer(), JsonObject(params))

        pushProgress("waiting_for_tag", 0, "Hold your phone near the passport")

        val tag = awaitNfcTag()

        val isoDep =
            IsoDep.get(tag)
                ?: throw BridgeHandlerException("NFC_NOT_ISO_DEP", "Tag is not an IsoDep tag")
        isoDep.timeout = 20_000

        try {
            return readPassport(isoDep, scanParams)
        } finally {
            try {
                isoDep.close()
            } catch (_: Exception) {
            }
            disableReaderMode()
        }
    }

    /**
     * Scans the NFC passport with progress callbacks.
     * This method invokes the onProgress callback at each stage of the scan process.
     *
     * @param params Map containing passport parameters (passportNumber, dateOfBirth, dateOfExpiry, etc.)
     * @param onProgress Callback invoked at each scan stage with the current NfcScanState
     * @return JsonElement containing the scanned passport data
     */
    suspend fun scanWithProgress(
        params: Map<String, JsonElement>,
        onProgress: (NfcScanState) -> Unit,
    ): JsonElement {
        progressCallback = onProgress
        try {
            return scan(params)
        } finally {
            progressCallback = null
        }
    }

    /**
     * Suspend until an NFC tag is discovered via enableReaderMode.
     */
    suspend fun awaitNfcTag(): Tag {
        val adapter =
            NfcAdapter.getDefaultAdapter(activity)
                ?: throw BridgeHandlerException("NFC_NOT_SUPPORTED", "NFC is not available")

        if (!adapter.isEnabled) {
            throw BridgeHandlerException("NFC_NOT_ENABLED", "NFC is disabled")
        }

        return suspendCancellableCoroutine { cont ->
            adapter.enableReaderMode(
                activity,
                { tag ->
                    // Only resume if the continuation is still active
                    // This prevents crashes from multiple tag detections
                    if (cont.isActive) {
                        cont.resume(tag)
                    }
                },
                NfcAdapter.FLAG_READER_NFC_A or
                    NfcAdapter.FLAG_READER_NFC_B or
                    NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK,
                null,
            )

            cont.invokeOnCancellation {
                try {
                    adapter.disableReaderMode(activity)
                } catch (_: Exception) {
                }
            }
        }
    }

    private fun disableReaderMode() {
        try {
            NfcAdapter.getDefaultAdapter(activity)?.disableReaderMode(activity)
        } catch (_: Exception) {
        }
    }

    private suspend fun readPassport(
        isoDep: IsoDep,
        scanParams: NfcScanParams,
    ): JsonElement {
        pushProgress("connecting", 5, "Connecting to passport...")

        val cardService =
            try {
                CardService.getInstance(isoDep)
            } catch (e: Exception) {
                // Retry once after reconnect
                isoDep.close()
                delay(500)
                isoDep.connect()
                CardService.getInstance(isoDep)
            }

        try {
            cardService.open()
        } catch (e: Exception) {
            isoDep.close()
            delay(500)
            isoDep.connect()
            cardService.open()
        }

        val service =
            PassportService(
                cardService,
                PassportService.NORMAL_MAX_TRANCEIVE_LENGTH * 2,
                PassportService.DEFAULT_MAX_BLOCKSIZE * 2,
                false,
                false,
            )
        service.open()

        var paceSucceeded = false
        var bacSucceeded = false
        val bacKey: BACKeySpec =
            BACKey(
                scanParams.passportNumber,
                scanParams.dateOfBirth,
                scanParams.dateOfExpiry,
            )

        // --- PACE authentication ---
        if (scanParams.skipPACE != true) {
            paceSucceeded = tryPace(service, scanParams, bacKey)
        }

        // --- BAC fallback ---
        if (!paceSucceeded) {
            bacSucceeded = tryBac(service, bacKey)
        }

        if (!paceSucceeded && !bacSucceeded) {
            throw BridgeHandlerException("AUTH_FAILED", "Neither PACE nor BAC authentication succeeded")
        }

        // Select applet after auth
        try {
            service.sendSelectApplet(true)
        } catch (e: Exception) {
            val msg = e.message ?: ""
            if (!msg.contains("6982") && !msg.contains("SECURITY STATUS NOT SATISFIED", ignoreCase = true)) {
                throw e
            }
        }

        // --- Read DG1 ---
        pushProgress("reading_dg1", 40, "Reading passport data...")
        val dg1In = service.getInputStream(PassportService.EF_DG1)
        val dg1File = DG1File(dg1In)

        // --- Read SOD ---
        pushProgress("reading_sod", 55, "Reading security data...")
        val sodIn = service.getInputStream(PassportService.EF_SOD)
        val sodFile = SODFile(sodIn)

        // --- Chip Authentication ---
        var chipAuthSucceeded = false
        if (scanParams.skipCA != true) {
            pushProgress("chip_auth", 70, "Chip authentication...")
            chipAuthSucceeded = doChipAuth(service)
        }

        pushProgress("building_result", 90, "Processing passport data...")

        val result = buildResult(dg1File, sodFile, paceSucceeded, chipAuthSucceeded)

        pushProgress("complete", 100, "Scan complete")

        return result
    }

    private fun tryPace(
        service: PassportService,
        scanParams: NfcScanParams,
        bacKey: BACKeySpec,
    ): Boolean {
        try {
            pushProgress("pace", 10, "Attempting PACE authentication...")
            val cardAccessFile = CardAccessFile(service.getInputStream(PassportService.EF_CARD_ACCESS))
            val securityInfos = cardAccessFile.securityInfos

            val paceKey: PACEKeySpec =
                if (scanParams.useCan == true && !scanParams.canNumber.isNullOrEmpty()) {
                    PACEKeySpec.createCANKey(scanParams.canNumber)
                } else {
                    PACEKeySpec.createMRZKey(bacKey)
                }

            for (securityInfo: SecurityInfo in securityInfos) {
                if (securityInfo is PACEInfo) {
                    try {
                        service.doPACE(
                            paceKey,
                            securityInfo.objectIdentifier,
                            PACEInfo.toParameterSpec(securityInfo.parameterId),
                            null,
                        )
                        Log.d(TAG, "PACE succeeded")
                        pushProgress("pace_succeeded", 25, "PACE authentication succeeded")
                        return true
                    } catch (e: Exception) {
                        Log.w(TAG, "PACE failed for OID: ${securityInfo.objectIdentifier}", e)
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "PACE failed entirely", e)
        }
        return false
    }

    private suspend fun tryBac(
        service: PassportService,
        bacKey: BACKeySpec,
    ): Boolean {
        pushProgress("bac", 15, "Attempting BAC authentication...")

        try {
            service.sendSelectApplet(false)
        } catch (_: Exception) {
        }

        var attempts = 0
        val maxAttempts = 3

        while (attempts < maxAttempts) {
            try {
                attempts++
                if (attempts > 1) delay(500)

                // Check if passport requires BAC by trying to read EF_COM
                val bacRequired =
                    try {
                        service.getInputStream(PassportService.EF_COM).read()
                        false // EF_COM readable without BAC
                    } catch (_: Exception) {
                        true // EF_COM not readable, BAC required
                    }

                if (bacRequired) {
                    service.doBAC(bacKey)
                    Log.d(TAG, "BAC succeeded on attempt $attempts")
                    pushProgress("bac_succeeded", 25, "BAC authentication succeeded")
                } else {
                    Log.d(TAG, "BAC not required, passport already accessible")
                    pushProgress("bac_not_required", 25, "Authentication succeeded (BAC not required)")
                }

                return true
            } catch (e: Exception) {
                Log.w(TAG, "BAC attempt $attempts failed", e)
                if (attempts == maxAttempts) break
            }
        }
        return false
    }

    private fun doChipAuth(service: PassportService): Boolean {
        try {
            val dg14In = service.getInputStream(PassportService.EF_DG14)
            val dg14Encoded = IOUtils.toByteArray(dg14In)
            val dg14File = DG14File(ByteArrayInputStream(dg14Encoded))
            val securityInfos = dg14File.securityInfos

            for (securityInfo: SecurityInfo in securityInfos) {
                if (securityInfo is ChipAuthenticationPublicKeyInfo) {
                    service.doEACCA(
                        securityInfo.keyId,
                        securityInfo.objectIdentifier,
                        securityInfo.objectIdentifier,
                        securityInfo.subjectPublicKey,
                    )
                    Log.d(TAG, "Chip authentication succeeded")
                    return true
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Chip authentication failed", e)
        }
        return false
    }

    private fun buildResult(
        dg1File: DG1File,
        sodFile: SODFile,
        paceSucceeded: Boolean,
        chipAuthSucceeded: Boolean,
    ): JsonElement {
        val mrzInfo = dg1File.mrzInfo

        val certificate = sodFile.docSigningCertificate
        val certBase64 = Base64.encodeToString(certificate.encoded, Base64.NO_WRAP)
        val pemCert = "-----BEGIN CERTIFICATE-----\n${Base64.encodeToString(certificate.encoded, Base64.DEFAULT)}-----END CERTIFICATE-----"

        val publicKey = certificate.publicKey
        val publicKeyInfo =
            if (publicKey is RSAPublicKey) {
                buildJsonObject { put("modulus", publicKey.modulus.toString()) }
            } else if (publicKey is org.bouncycastle.jce.interfaces.ECPublicKey) {
                buildJsonObject { put("publicKeyQ", publicKey.q.toString()) }
            } else {
                buildJsonObject {}
            }

        // Extract LDS security object for encapContent
        val ldsso =
            try {
                val signedDataField = SODFile::class.java.getDeclaredField("signedData")
                signedDataField.isAccessible = true
                val signedData = signedDataField.get(sodFile) as SignedData
                val getLDS = SODFile::class.java.getDeclaredMethod("getLDSSecurityObject", SignedData::class.java)
                getLDS.isAccessible = true
                getLDS.invoke(sodFile, signedData) as LDSSecurityObject
            } catch (e: Exception) {
                Log.w(TAG, "Failed to extract LDS security object via reflection", e)
                null
            }

        return buildJsonObject {
            put("mrz", mrzInfo.toString())
            put("documentType", mrzInfo.documentCode)
            put("issuingState", mrzInfo.issuingState)
            put("surname", mrzInfo.primaryIdentifier)
            put("givenNames", mrzInfo.secondaryIdentifier)
            put("documentNumber", mrzInfo.documentNumber)
            put("nationality", mrzInfo.nationality)
            put("dateOfBirth", mrzInfo.dateOfBirth)
            put("gender", mrzInfo.gender.toString())
            put("dateOfExpiry", mrzInfo.dateOfExpiry)
            put("personalNumber", mrzInfo.personalNumber)
            put("documentSigningCertificate", pemCert)
            put("signatureAlgorithm", certificate.sigAlgName)
            put("digestAlgorithm", sodFile.digestAlgorithm)
            put("signerInfoDigestAlgorithm", sodFile.signerInfoDigestAlgorithm)
            put("digestEncryptionAlgorithm", sodFile.digestEncryptionAlgorithm)
            put("LDSVersion", sodFile.ldsVersion)
            put("unicodeVersion", sodFile.unicodeVersion)
            put("eContent", Base64.encodeToString(sodFile.eContent, Base64.NO_WRAP))
            put("encryptedDigest", Base64.encodeToString(sodFile.encryptedDigest, Base64.NO_WRAP))
            ldsso?.let {
                put("encapContent", Base64.encodeToString(it.encoded, Base64.NO_WRAP))
            }

            // Data group hashes as hex strings
            val hashesObj =
                buildJsonObject {
                    for ((dgNum, hash) in sodFile.dataGroupHashes) {
                        put(dgNum.toString(), hash.joinToString("") { "%02x".format(it) })
                    }
                }
            put("dataGroupHashes", hashesObj)

            // Public key info
            for ((key, value) in publicKeyInfo) {
                put(key, value)
            }

            put("paceSucceeded", paceSucceeded)
            put("chipAuthSucceeded", chipAuthSucceeded)
        }
    }

    private fun pushProgress(
        step: String,
        percent: Int,
        message: String,
    ) {
        val progress = NfcScanProgress(step, percent, message)
        val progressJson = json.encodeToString(NfcScanProgress.serializer(), progress)
        val progressElement = json.parseToJsonElement(progressJson)
        router.pushEvent(BridgeDomain.NFC, "scanProgress", progressElement)

        // Invoke progress callback if set
        progressCallback?.let { callback ->
            val state =
                when (step) {
                    "waiting_for_tag" -> NfcScanState.WAITING_FOR_TAG
                    "connecting" -> NfcScanState.CONNECTING
                    "pace", "bac", "pace_succeeded", "bac_succeeded", "bac_not_required" -> NfcScanState.AUTHENTICATING
                    "reading_dg1" -> NfcScanState.READING_DATA
                    "reading_sod" -> NfcScanState.READING_SECURITY
                    "chip_auth" -> NfcScanState.AUTHENTICATING_CHIP
                    "building_result" -> NfcScanState.FINALIZING
                    "complete" -> NfcScanState.COMPLETE
                    else -> null
                }
            state?.let(callback)
        }
    }

    companion object {
        private const val TAG = "NfcBridgeHandler"
    }
}
