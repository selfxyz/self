/*
 * Copyright 2016 - 2022 Anton Tananaev (anton.tananaev@gmail.com)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
@file:Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")

package io.tradle.nfc


import android.annotation.SuppressLint
import android.app.PendingIntent
import android.content.Intent
import android.graphics.Bitmap
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.IsoDep
import android.os.AsyncTask
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.util.Base64
import android.util.Log
import android.widget.EditText
import android.content.Context

import androidx.appcompat.app.AppCompatActivity
import io.tradle.nfc.ImageUtil.decodeImage
import net.sf.scuba.smartcards.CardService
import org.apache.commons.io.IOUtils

import org.bouncycastle.asn1.ASN1InputStream
import org.bouncycastle.asn1.cms.ContentInfo
import org.bouncycastle.asn1.cms.SignedData
import org.bouncycastle.asn1.ASN1Primitive
import org.bouncycastle.asn1.ASN1Sequence
import org.bouncycastle.asn1.ASN1Set
import org.bouncycastle.asn1.ASN1TaggedObject;
import org.bouncycastle.asn1.icao.DataGroupHash;
import org.bouncycastle.asn1.icao.LDSSecurityObject;
import org.bouncycastle.asn1.x509.Certificate
import org.bouncycastle.jce.spec.ECNamedCurveSpec
import org.bouncycastle.jce.interfaces.ECPublicKey


import org.jmrtd.BACKey
import org.jmrtd.BACKeySpec
import org.jmrtd.AccessKeySpec
import org.jmrtd.PassportService
import org.jmrtd.lds.CardAccessFile
import org.jmrtd.lds.ChipAuthenticationPublicKeyInfo
import org.jmrtd.lds.PACEInfo
import org.jmrtd.PACEKeySpec
import org.jmrtd.lds.SODFile
import org.jmrtd.lds.SecurityInfo
import org.jmrtd.lds.icao.DG14File
import org.jmrtd.lds.icao.DG1File
import org.jmrtd.lds.icao.DG2File
import org.jmrtd.lds.iso19794.FaceImageInfo

import org.json.JSONObject

import java.io.ByteArrayInputStream
import java.io.DataInputStream
import java.io.InputStream
import java.io.IOException
import java.io.FileOutputStream
import java.io.ByteArrayOutputStream
import java.io.File
import java.security.KeyStore
import java.security.MessageDigest
import java.security.Signature
import java.security.cert.CertPathValidator
import java.security.cert.CertificateFactory
import java.security.cert.PKIXParameters
import java.security.cert.X509Certificate
import java.security.spec.MGF1ParameterSpec
import java.security.spec.PSSParameterSpec
import java.text.ParseException
import java.security.interfaces.RSAPublicKey
import java.text.SimpleDateFormat
import java.util.*
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.security.PublicKey
import java.security.spec.X509EncodedKeySpec
import javax.crypto.Cipher

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

import com.google.gson.Gson;

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReadableNativeMap
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Callback

object Messages {
    const val SCANNING = "Scanning....."
    const val STOP_MOVING = "Stop moving....." 
    const val AUTH = "Auth....."
    const val COMPARING = "Comparing....."
    const val COMPLETED = "Scanning completed"
    const val RESET = ""
    const val PACE_STARTED = "PACE started"
    const val PACE_SUCCEEDED = "PACE succeeded"
    const val PACE_FAILED = "PACE failed"
    const val BAC_STARTED = "BAC started"
    const val BAC_SUCCEEDED = "BAC succeeded"
    const val BAC_FAILED = "BAC failed"
    const val READING_COM = "Reading COM....."
    const val READING_DG1 = "Reading DG1....."
    const val READING_DG1_SUCCEEDED = "Reading DG1 succeeded"
    const val READING_DG2 = "Reading DG2....."
    const val READING_DG2_SUCCEEDED = "Reading DG2 succeeded"
    const val READING_SOD = "Reading SOD....."
    const val READING_SOD_SUCCEEDED = "Reading SOD succeeded"
    const val READING_DG14 = "Reading DG14....."
    const val CHIP_AUTH_SUCCEEDED = "Chip authentication succeeded"
}

class Response(json: String) : JSONObject(json) {
    val type: String? = this.optString("type")
    val data = this.optJSONArray("data")
        ?.let { 0.until(it.length()).map { i -> it.optJSONObject(i) } } // returns an array of JSONObject
        ?.map { Foo(it.toString()) } // transforms each JSONObject of the array into Foo
}

class Foo(json: String) : JSONObject(json) {
    val id = this.optInt("id")
    val title: String? = this.optString("title")
}

class RNPassportReaderModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), LifecycleEventListener {
    // private var passportNumberFromIntent = false
    // private var encodePhotoToBase64 = false
    private var scanPromise: Promise? = null
    private var opts: ReadableMap? = null
    private val apduLogger = APDULogger()
    private var currentSessionId: String? = null
    
    data class Data(val id: String, val digest: String, val signature: String, val publicKey: String)

    data class PassportData(
      val dg1File: DG1File,
      val dg2File: DG2File,
      val sodFile: SODFile
    )

    interface DataCallback {
      fun onDataReceived(data: String)
    }
      
    init {
      instance = this
      reactContext.addLifecycleEventListener(this)
      apduLogger.setModuleReference(this)
    }

    override fun onCatalystInstanceDestroy() {
        reactContext.removeLifecycleEventListener(this)
    }

    override fun getName(): String {
        return "RNPassportReader"
    }

    fun sendDataToJS(passportData: PassportData) {
      val gson = Gson()

      val dataMap = Arguments.createMap()
      dataMap.putString("passportData", gson.toJson(passportData))
      // Add all the other fields of the YourDataClass object to the map

      reactApplicationContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("ReadDataTaskCompleted", dataMap)
    }

    @ReactMethod
    fun scan(opts: ReadableMap, promise: Promise) {
        currentSessionId = generateSessionId()
        
        apduLogger.setContext("session_id", currentSessionId!!)
        
        // Log scan start
        logAnalyticsEvent("nfc_scan_started", mapOf(
            "use_can" to (opts.getBoolean(PARAM_USE_CAN) ?: false),
            "has_document_number" to (!opts.getString(PARAM_DOC_NUM).isNullOrEmpty()),
            "has_can_number" to (!opts.getString(PARAM_CAN).isNullOrEmpty()),
            "platform" to "android"
        ))
        
        eventMessageEmitter(Messages.SCANNING)
        val mNfcAdapter = NfcAdapter.getDefaultAdapter(reactApplicationContext)
        // val mNfcAdapter = NfcAdapter.getDefaultAdapter(this.reactContext)
        if (mNfcAdapter == null) {
            logAnalyticsError("nfc_not_supported", "NFC chip reading not supported")
            promise.reject("E_NOT_SUPPORTED", "NFC chip reading not supported")
            return
        }

        if (!mNfcAdapter.isEnabled) {
            logAnalyticsError("nfc_not_enabled", "NFC chip reading not enabled")
            promise.reject("E_NOT_ENABLED", "NFC chip reading not enabled")
            return
        }

        if (scanPromise != null) {
            logAnalyticsError("nfc_already_scanning", "Already running a scan")
            promise.reject("E_ONE_REQ_AT_A_TIME", "Already running a scan")
            return
        }

        this.opts = opts
        this.scanPromise = promise
        // Log.d("RNPassportReaderModule", "opts set to: " + opts.toString())
    }

    private fun resetState() {
        scanPromise = null
        opts = null
    }

    override fun onHostDestroy() {
        resetState()
    }

    override fun onHostResume() {
        val mNfcAdapter = NfcAdapter.getDefaultAdapter(this.reactContext)
        mNfcAdapter?.let {
            val activity = currentActivity
            activity?.let {
                val intent = Intent(it.applicationContext, it.javaClass)
                intent.flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
                val pendingIntent = PendingIntent.getActivity(it, 0, intent, PendingIntent.FLAG_MUTABLE) // PendingIntent.FLAG_UPDATE_CURRENT
                val filter = arrayOf(arrayOf(IsoDep::class.java.name))
                mNfcAdapter.enableForegroundDispatch(it, pendingIntent, null, filter)
            }
        }
    }

    override fun onHostPause() {
        val mNfcAdapter = NfcAdapter.getDefaultAdapter(this.reactContext)
        mNfcAdapter?.disableForegroundDispatch(currentActivity)
    }

    fun receiveIntent(intent: Intent) {
        Log.d("RNPassportReaderModule", "receiveIntent: " + intent.action)
        if (scanPromise == null) return
        if (NfcAdapter.ACTION_TECH_DISCOVERED == intent.action) {
            val tag: Tag? = intent.extras?.getParcelable(NfcAdapter.EXTRA_TAG)
            if (tag?.techList?.contains("android.nfc.tech.IsoDep") == true) {
                val passportNumber = opts?.getString(PARAM_DOC_NUM)
                val expirationDate = opts?.getString(PARAM_DOE)
                val birthDate = opts?.getString(PARAM_DOB)
                val cardAccessNumber = opts?.getString(PARAM_CAN)
                val useCan = opts?.getBoolean(PARAM_USE_CAN) ?: false

                if (useCan && !cardAccessNumber.isNullOrEmpty()) {
                    val paceKey: PACEKeySpec = PACEKeySpec.createCANKey(cardAccessNumber)
                    ReadTask(IsoDep.get(tag), paceKey).execute()
                }
                else if (!passportNumber.isNullOrEmpty() && !expirationDate.isNullOrEmpty() && !birthDate.isNullOrEmpty()) {
                    val bacKey: BACKeySpec = BACKey(passportNumber, birthDate, expirationDate)
                    ReadTask(IsoDep.get(tag), bacKey).execute()
                }
            }
        }
    }

    
    private fun toBase64(bitmap: Bitmap, quality: Int): String {
      val byteArrayOutputStream = ByteArrayOutputStream()
      bitmap.compress(Bitmap.CompressFormat.JPEG, quality, byteArrayOutputStream)
      val byteArray = byteArrayOutputStream.toByteArray()
      return JPEG_DATA_URI_PREFIX + Base64.encodeToString(byteArray, Base64.NO_WRAP)
    }

    @SuppressLint("StaticFieldLeak")
    private inner class ReadTask(
        private val isoDep: IsoDep,
        private val authKey: AccessKeySpec
    ) : AsyncTask<Void?, Void?, Exception?>() {

        private lateinit var dg1File: DG1File
        private lateinit var dg2File: DG2File
        private lateinit var dg14File: DG14File
        private lateinit var sodFile: SODFile
        private var imageBase64: String? = null
        private var bitmap: Bitmap? = null
        private var chipAuthSucceeded = false
        private var passiveAuthSuccess = false
        private lateinit var dg14Encoded: ByteArray

        override fun doInBackground(vararg params: Void?): Exception? {
            try {
                logAnalyticsEvent("nfc_reading_started")
                eventMessageEmitter(Messages.STOP_MOVING)
                isoDep.timeout = 20000
                Log.e("MY_LOGS", "This should obvsly log")
                val cardService = try {
                    CardService.getInstance(isoDep)
                } catch (e: Exception) {
                    logAnalyticsError("nfc_card_service_failed", "Failed to get CardService instance: ${e.message}")
                    Log.e("MY_LOGS", "Failed to get CardService instance", e)
                    throw e
                }

                try {
                    cardService.open()
                } catch (e: Exception) {
                    logAnalyticsError("nfc_card_service_open_failed", "Failed to open CardService: ${e.message}")
                    Log.e("MY_LOGS", "Failed to open CardService", e)
                    isoDep.close()
                    Thread.sleep(500)
                    isoDep.connect()
                    cardService.open()
                }
                Log.e("MY_LOGS", "cardService opened")
                logAnalyticsEvent("nfc_card_service_opened")
                val service = PassportService(
                    cardService,
                    PassportService.NORMAL_MAX_TRANCEIVE_LENGTH * 2,
                    PassportService.DEFAULT_MAX_BLOCKSIZE * 2,
                    false,
                    false,
                )
                Log.e("MY_LOGS", "service gotten")
                
                service.addAPDUListener(apduLogger)
                
                service.open()
                Log.e("MY_LOGS", "service opened")
                logAnalyticsEvent("nfc_passport_service_opened")
                var paceSucceeded = false
                var bacSucceeded = false
                try {
                    Log.e("MY_LOGS", "trying to get cardAccessFile...")
                    val cardAccessFile = CardAccessFile(service.getInputStream(PassportService.EF_CARD_ACCESS))
                    Log.e("MY_LOGS", "cardAccessFile: ${cardAccessFile}")

                    val securityInfoCollection = cardAccessFile.securityInfos
                    for (securityInfo: SecurityInfo in securityInfoCollection) {
                        if (securityInfo is PACEInfo) {
                            Log.e("MY_LOGS", "trying PACE...")
                            eventMessageEmitter(Messages.PACE_STARTED)
                            apduLogger.setContext("operation", "pace_authentication")
                            apduLogger.setContext("auth_key_type", authKey.javaClass.simpleName)
                            
                            // Determine proper PACE key: use CAN key if provided; otherwise derive PACE MRZ key from BAC
                            val paceKeyToUse: PACEKeySpec? = when (authKey) {
                                is PACEKeySpec -> authKey
                                is BACKey -> PACEKeySpec.createMRZKey(authKey)
                                else -> null
                            }
                            if (paceKeyToUse != null) {
                                service.doPACE(
                                    paceKeyToUse,
                                    securityInfo.objectIdentifier,
                                    PACEInfo.toParameterSpec(securityInfo.parameterId),
                                    null,
                                )
                            } else {
                                throw IllegalStateException("Unsupported auth key for PACE: ${authKey::class.java.simpleName}")
                            }
                            Log.e("MY_LOGS", "PACE succeeded")
                            paceSucceeded = true
                            logAnalyticsEvent("nfc_pace_succeeded")
                            eventMessageEmitter(Messages.PACE_SUCCEEDED)
                            // Stop iterating once PACE succeeds to avoid disrupting session with another attempt
                            break
                        }
                    }
                } catch (e: Exception) {
                    logAnalyticsError("nfc_pace_failed", "PACE authentication failed: ${e.message}")
                    logAnalyticsEvent("nfc_pace_attempted", mapOf(
                        "success" to false,
                        "error_type" to e.javaClass.simpleName
                    ))
                    Log.w("MY_LOGS", e)
                    eventMessageEmitter(Messages.PACE_FAILED)
                }
                // (Reverted) Do not select applet before authentication; proceed to BAC if needed

                // Attempt BAC fallback if PACE failed
                if (!paceSucceeded && authKey is BACKeySpec) {
                    var attempts = 0
                    val maxAttempts = 3

                    eventMessageEmitter(Messages.BAC_STARTED)
                    
                    apduLogger.setContext("operation", "bac_authentication")
                    apduLogger.setContext("auth_key_type", authKey.javaClass.simpleName)
                    
                    while (!bacSucceeded && attempts < maxAttempts) {
                        try {
                            attempts++
                            Log.e("MY_LOGS", "BAC attempt $attempts of $maxAttempts")
                            if (attempts > 1) Thread.sleep(500)
                            // Try to read EF_COM first; if it fails, do BAC
                            try {
                                eventMessageEmitter(Messages.READING_COM)
                                service.getInputStream(PassportService.EF_COM).read()
                            } catch (e: Exception) {
                                service.doBAC(authKey)
                            }

                            bacSucceeded = true
                            logAnalyticsEvent("nfc_bac_succeeded", mapOf("attempts" to attempts))
                            logAnalyticsEvent("nfc_bac_attempted", mapOf(
                                "success" to true,
                                "attempts" to attempts
                            ))
                            Log.e("MY_LOGS", "BAC succeeded on attempt $attempts")
                            eventMessageEmitter(Messages.BAC_SUCCEEDED)
                        } catch (e: Exception) {
                            val errClass = e.javaClass.simpleName
                            val errMsg = e.message ?: ""
                            logAnalyticsError("nfc_bac_attempt_failed", "BAC attempt $attempts failed: ${e.message}")
                            logAnalyticsEvent("nfc_bac_attempted", mapOf(
                                "success" to false,
                                "attempt" to attempts,
                                "error_type" to errClass
                            ))
                            Log.e("MY_LOGS", "BAC attempt $attempts failed: $errClass - $errMsg")
                            if (e is org.jmrtd.CardServiceProtocolException) {
                                // Provide additional structured diagnostics without sensitive data
                                logAnalyticsEvent("nfc_bac_protocol_error", mapOf(
                                    "attempt" to attempts,
                                    "message_contains_sw" to (errMsg.contains("SW = ")),
                                    "message_length" to errMsg.length
                                ))
                            }
                            if (attempts == maxAttempts) {
                                eventMessageEmitter(Messages.BAC_FAILED)
                                throw e
                            }
                        }
                    }
                }

                // Ensure we have established authentication before reading
                if (!paceSucceeded && !bacSucceeded) {
                    throw IOException("Authentication not established; cannot read data groups")
                }

                // Select applet after authentication established; handle 0x6982 gracefully
                try {
                    Log.e("MY_LOGS", "Sending select applet command after auth. paceSucceeded=$paceSucceeded, bacSucceeded=$bacSucceeded")
                    service.sendSelectApplet(true) //we have already checked either paceSucceeded OR bacSucceeded is true. So we should send true to use SecureMessaging
                    logAnalyticsEvent("nfc_select_applet_succeeded", mapOf(
                        "pace_succeeded" to paceSucceeded,
                        "bac_succeeded" to bacSucceeded
                    ))
                } catch (e: Exception) {
                    val msg = e.message ?: ""
                    logAnalyticsError("nfc_select_applet_failed", "Select applet failed: ${e.message}")
                    if (msg.contains("6982") || msg.contains("SECURITY STATUS NOT SATISFIED", ignoreCase = true)) {
                        Log.w(TAG, "Select applet returned 6982; proceeding after established auth")
                    } else {
                        throw e
                    }
                }


                logAnalyticsEvent("nfc_reading_data_groups")
                
                apduLogger.setContext("operation", "reading_data_groups")
                apduLogger.setContext("pace_succeeded", paceSucceeded)
                apduLogger.setContext("bac_succeeded", bacSucceeded)
                
                eventMessageEmitter(Messages.READING_DG1)
                logAnalyticsEvent("nfc_reading_dg1_started")
                val dg1In = service.getInputStream(PassportService.EF_DG1)
                dg1File = DG1File(dg1In)
                logAnalyticsEvent("nfc_reading_dg1_completed")
                eventMessageEmitter(Messages.READING_DG1_SUCCEEDED)
                // eventMessageEmitter("Reading DG2.....")
                // val dg2In = service.getInputStream(PassportService.EF_DG2)
                // dg2File = DG2File(dg2In)
                logAnalyticsEvent("nfc_reading_sod_started")
                eventMessageEmitter(Messages.READING_SOD)
                val sodIn = service.getInputStream(PassportService.EF_SOD)
                sodFile = SODFile(sodIn)
                logAnalyticsEvent("nfc_reading_sod_completed")
                eventMessageEmitter(Messages.READING_SOD_SUCCEEDED)

                // val gson = Gson()
                // Log.d(TAG, "============FIRST CONSOLE LOG=============")
                // Log.d(TAG, "dg1File: " + gson.toJson(dg1File))
                // Log.d(TAG, "dg2File: " + gson.toJson(dg2File))
                // Log.d(TAG, "sodFile.docSigningCertificate: ${sodFile.docSigningCertificate}")
                // Log.d(TAG, "publicKey: ${sodFile.docSigningCertificate.publicKey}")
                // Log.d(TAG, "publicKey: ${sodFile.docSigningCertificate.publicKey.toString()}")
                // Log.d(TAG, "publicKey: ${sodFile.docSigningCertificate.publicKey.format}")
                // Log.d(TAG, "publicKey: ${Base64.encodeToString(sodFile.docSigningCertificate.publicKey.encoded, Base64.DEFAULT)}")
                // Log.d(TAG, "sodFile.docSigningCertificate: ${gson.toJson(sodFile.docSigningCertificate)}")
                // Log.d(TAG, "sodFile.dataGroupHashes: ${sodFile.dataGroupHashes}")
                // Log.d(TAG, "sodFile.dataGroupHashes: ${gson.toJson(sodFile.dataGroupHashes)}")
                // Log.d(TAG, "concatenated: $concatenated")
                // Log.d(TAG, "concatenated: ${gson.toJson(concatenated)}")
                // Log.d(TAG, "concatenated: ${gson.toJson(concatenated.joinToString("") { "%02x".format(it) })}")
                // Log.d(TAG, "sodFile.eContent: ${sodFile.eContent}")
                // Log.d(TAG, "sodFile.eContent: ${gson.toJson(sodFile.eContent)}")
                // Log.d(TAG, "sodFile.eContent: ${gson.toJson(sodFile.eContent.joinToString("") { "%02x".format(it) })}")
                // Log.d(TAG, "sodFile.encryptedDigest: ${sodFile.encryptedDigest}")
                // Log.d(TAG, "sodFile.encryptedDigest: ${gson.toJson(sodFile.encryptedDigest)}")
                // Log.d(TAG, "sodFile.encryptedDigest: ${gson.toJson(sodFile.encryptedDigest.joinToString("") { "%02x".format(it) })}")
                // var id = passportNumberView.text.toString()
                // try {
                //     postData(id, sodFile.eContent.joinToString("") { "%02x".format(it) }, sodFile.encryptedDigest.joinToString("") { "%02x".format(it) }, sodFile.docSigningCertificate.publicKey.toString())
                // } catch (e: IOException) {
                //     e.printStackTrace()
                // }
                // Log.d(TAG, "============LET'S VERIFY THE SIGNATURE=============")
                eventMessageEmitter(Messages.AUTH)
                logAnalyticsEvent("nfc_authentication_started")
                doChipAuth(service)
                doPassiveAuth()
                logAnalyticsEvent("nfc_authentication_completed")

                // Log.d(TAG, "============SIGNATURE VERIFIED=============")
                // sendDataToJS(PassportData(dg1File, dg2File, sodFile))
                // Log.d(TAG, "============DATA SENT TO JS=============")

                // val allFaceImageInfo: MutableList<FaceImageInfo> = ArrayList()
                // dg2File.faceInfos.forEach {
                //     allFaceImageInfo.addAll(it.faceImageInfos)
                // }
                // if (allFaceImageInfo.isNotEmpty()) {
                //     val faceImageInfo = allFaceImageInfo.first()
                //     val imageLength = faceImageInfo.imageLength
                //     val dataInputStream = DataInputStream(faceImageInfo.imageInputStream)
                //     val buffer = ByteArray(imageLength)
                //     dataInputStream.readFully(buffer, 0, imageLength)
                //     val inputStream: InputStream = ByteArrayInputStream(buffer, 0, imageLength)
                //     bitmap = decodeImage(reactContext, faceImageInfo.mimeType, inputStream)
                //     imageBase64 = Base64.encodeToString(buffer, Base64.DEFAULT)
                // }
            } catch (e: Exception) {
                logAnalyticsError("nfc_reading_failed", "NFC reading failed: ${e.message}")
                eventMessageEmitter(Messages.RESET)
                return e
            }
            return null
        }

        private fun doChipAuth(service: PassportService) {
            try {
                apduLogger.setContext("operation", "chip_authentication")
                
                logAnalyticsEvent("nfc_reading_dg14_started")
                eventMessageEmitter(Messages.READING_DG14)
                val dg14In = service.getInputStream(PassportService.EF_DG14)
                dg14Encoded = IOUtils.toByteArray(dg14In)
                val dg14InByte = ByteArrayInputStream(dg14Encoded)
                dg14File = DG14File(dg14InByte)
                logAnalyticsEvent("nfc_reading_dg14_completed")
                val dg14FileSecurityInfo = dg14File.securityInfos
                for (securityInfo: SecurityInfo in dg14FileSecurityInfo) {
                    if (securityInfo is ChipAuthenticationPublicKeyInfo) {
                        service.doEACCA(
                            securityInfo.keyId,
                            ChipAuthenticationPublicKeyInfo.ID_CA_ECDH_AES_CBC_CMAC_256,
                            securityInfo.objectIdentifier,
                            securityInfo.subjectPublicKey,
                        )
                        chipAuthSucceeded = true
                        logAnalyticsEvent("nfc_chip_auth_succeeded")
                        eventMessageEmitter(Messages.CHIP_AUTH_SUCCEEDED)
                    }
                }
            } catch (e: Exception) {
                logAnalyticsError("nfc_chip_auth_failed", "Chip authentication failed: ${e.message}")
                Log.w(TAG, e)
            }
        }

        private fun doPassiveAuth() {
            try {
                apduLogger.setContext("operation", "passive_authentication")
                apduLogger.setContext("chip_auth_succeeded", chipAuthSucceeded)
                
                logAnalyticsEvent("nfc_passive_auth_started")
                Log.d(TAG, "Starting passive authentication...")
                val digest = MessageDigest.getInstance(sodFile.digestAlgorithm)
                Log.d(TAG, "Using digest algorithm: ${sodFile.digestAlgorithm}")

                
                val dataHashes = sodFile.dataGroupHashes
                
                val dg14Hash = if (chipAuthSucceeded) digest.digest(dg14Encoded) else ByteArray(0)
                val dg1Hash = digest.digest(dg1File.encoded)
                val dg2Hash = digest.digest(dg2File.encoded)
                
                // val gson = Gson()
                // Log.d(TAG, "dataHashes " + gson.toJson(dataHashes))
                // val hexMap = sodFile.dataGroupHashes.mapValues { (_, value) ->
                //     value.joinToString("") { "%02x".format(it) }
                // }
                // Log.d(TAG, "hexMap: ${gson.toJson(hexMap)}")
                // Log.d(TAG, "concatenated: $concatenated")
                // Log.d(TAG, "concatenated: ${gson.toJson(concatenated)}")
                // Log.d(TAG, "concatenated: ${gson.toJson(concatenated.joinToString("") { "%02x".format(it) })}")
                // Log.d(TAG, "dg1File.encoded " + gson.toJson(dg1File.encoded))
                // Log.d(TAG, "dg1File.encoded.joinToString " + gson.toJson(dg1File.encoded.joinToString("") { "%02x".format(it) }))
                // Log.d(TAG, "dg1Hash " + gson.toJson(dg1Hash))
                // Log.d(TAG, "dg1Hash.joinToString " + gson.toJson(dg1Hash.joinToString("") { "%02x".format(it) }))
                // Log.d(TAG, "dg2File.encoded " + gson.toJson(dg2File.encoded))
                // Log.d(TAG, "dg2File.encoded.joinToString " + gson.toJson(dg2File.encoded.joinToString("") { "%02x".format(it) }))
                // Log.d(TAG, "dg2Hash " + gson.toJson(dg2Hash))
                // Log.d(TAG, "dg2HashjoinToString " + gson.toJson(dg2Hash.joinToString("") { "%02x".format(it) }))

                Log.d(TAG, "Comparing data group hashes...")
                eventMessageEmitter(Messages.COMPARING)
                logAnalyticsEvent("nfc_data_group_hash_verification_started")
                // if (Arrays.equals(dg1Hash, dataHashes[1]) && Arrays.equals(dg2Hash, dataHashes[2])
                if (Arrays.equals(dg1Hash, dataHashes[1])
                    && (!chipAuthSucceeded || Arrays.equals(dg14Hash, dataHashes[14]))) {

                    Log.d(TAG, "Data group hashes match.")
                    logAnalyticsEvent("nfc_data_group_hash_verification_succeeded")

                    val asn1InputStream = ASN1InputStream(getReactApplicationContext().assets.open("masterList"))
                    val keystore = KeyStore.getInstance(KeyStore.getDefaultType())
                    keystore.load(null, null)
                    val cf = CertificateFactory.getInstance("X.509")

                    var p: ASN1Primitive?
                    var obj = asn1InputStream.readObject()

                    while (obj != null) {
                        p = obj
                        val asn1 = ASN1Sequence.getInstance(p)
                        if (asn1 == null || asn1.size() == 0) {
                            throw IllegalArgumentException("Null or empty sequence passed.")
                        }

                        if (asn1.size() != 2) {
                            throw IllegalArgumentException("Incorrect sequence size: " + asn1.size())
                        }
                        val certSet = ASN1Set.getInstance(asn1.getObjectAt(1))
                        for (i in 0 until certSet.size()) {
                            val certificate = Certificate.getInstance(certSet.getObjectAt(i))
                            val pemCertificate = certificate.encoded
                            val javaCertificate = cf.generateCertificate(ByteArrayInputStream(pemCertificate))
                            keystore.setCertificateEntry(i.toString(), javaCertificate)
                        }
                        obj = asn1InputStream.readObject()

                    }

                    val docSigningCertificates = sodFile.docSigningCertificates
                    Log.d(TAG, "Checking document signing certificates for validity...")
                    logAnalyticsEvent("nfc_certificate_validation_started", mapOf(
                        "certificate_count" to docSigningCertificates.size
                    ))
                    for (docSigningCertificate: X509Certificate in docSigningCertificates) {
                        docSigningCertificate.checkValidity()
                        Log.d(TAG, "Certificate: ${docSigningCertificate.subjectDN} is valid.")
                    }
                    logAnalyticsEvent("nfc_certificate_validation_succeeded")

                    val cp = cf.generateCertPath(docSigningCertificates)
                    val pkixParameters = PKIXParameters(keystore)
                    pkixParameters.isRevocationEnabled = false
                    val cpv = CertPathValidator.getInstance(CertPathValidator.getDefaultType())
                    Log.d(TAG, "Validating certificate path...")
                    logAnalyticsEvent("nfc_certificate_path_validation_started")
                    cpv.validate(cp, pkixParameters)
                    logAnalyticsEvent("nfc_certificate_path_validation_succeeded")
                    var sodDigestEncryptionAlgorithm = sodFile.docSigningCertificate.sigAlgName
                    var isSSA = false
                    if ((sodDigestEncryptionAlgorithm == "SSAwithRSA/PSS")) {
                        sodDigestEncryptionAlgorithm = "SHA256withRSA/PSS"
                        isSSA = true

                    }
                    val sign = Signature.getInstance(sodDigestEncryptionAlgorithm)
                    if (isSSA) {
                        sign.setParameter(PSSParameterSpec("SHA-256", "MGF1", MGF1ParameterSpec.SHA256, 32, 1))
                    }
                    sign.initVerify(sodFile.docSigningCertificate)
                    sign.update(sodFile.eContent)

                    logAnalyticsEvent("nfc_signature_verification_started", mapOf(
                        "algorithm" to sodDigestEncryptionAlgorithm
                    ))
                    passiveAuthSuccess = sign.verify(sodFile.encryptedDigest)
                    if (passiveAuthSuccess) {
                        logAnalyticsEvent("nfc_signature_verification_succeeded")
                        logAnalyticsEvent("nfc_passive_auth_succeeded")
                    } else {
                        logAnalyticsError("nfc_signature_verification_failed", "Signature verification failed")
                        logAnalyticsError("nfc_passive_auth_failed", "Signature verification failed")
                    }
                    Log.d(TAG, "Passive authentication success: $passiveAuthSuccess")
                } else {
                    logAnalyticsError("nfc_passive_auth_failed", "Data group hashes do not match")
                }
            } catch (e: Exception) {
                logAnalyticsError("nfc_passive_auth_failed", "Passive authentication failed: ${e.message}")
                eventMessageEmitter(Messages.RESET)
                Log.w(TAG, "Exception in passive authentication", e)
            }
        }

        override fun onPostExecute(result: Exception?) {
            if (scanPromise == null) return

            if (result != null) {
                // Log.w(TAG, exceptionStack(result))
                if (result is IOException) {
                    logAnalyticsError("nfc_scan_failed_disconnect", "Lost connection to chip on card")
                    scanPromise?.reject("E_SCAN_FAILED_DISCONNECT", "Lost connection to chip on card")
                } else {
                    logAnalyticsError("nfc_scan_failed", "Scan failed: ${result.message}")
                    scanPromise?.reject("E_SCAN_FAILED", result)
                }

            apduLogger.clearContext()
            
            resetState()
                return
            }

            logAnalyticsEvent("nfc_scan_completed", mapOf(
                "chip_auth_succeeded" to chipAuthSucceeded,
                "passive_auth_success" to passiveAuthSuccess
            ))

            val mrzInfo = dg1File.mrzInfo

            val gson = Gson()

            // val signedDataField = SODFile::class.java.getDeclaredField("signedData")
            // signedDataField.isAccessible = true
            
          //   val signedData = signedDataField.get(sodFile) as SignedData
            
            val eContentAsn1InputStream = ASN1InputStream(sodFile.eContent.inputStream())
          //   val eContentDecomposed: ASN1Primitive = eContentAsn1InputStream.readObject()
  
            val passport = Arguments.createMap()
            passport.putString("mrz", mrzInfo.toString())
            passport.putString("signatureAlgorithm", sodFile.docSigningCertificate.sigAlgName) // this one is new
            Log.d(TAG, "sodFile.docSigningCertificate: ${sodFile.docSigningCertificate}")

            val certificate = sodFile.docSigningCertificate
            val certificateBytes = certificate.encoded
            val certificateBase64 = Base64.encodeToString(certificateBytes, Base64.DEFAULT)
            Log.d(TAG, "certificateBase64: ${certificateBase64}")
            

            passport.putString("documentSigningCertificate", certificateBase64)

            val publicKey = sodFile.docSigningCertificate.publicKey
            if (publicKey is RSAPublicKey) {
                passport.putString("modulus", publicKey.modulus.toString())
            } else if (publicKey is ECPublicKey) {
              // Handle the elliptic curve public key case
              
              // val w = publicKey.getW()
              // passport.putString("publicKeyW", w.toString())
              
              // val ecParams = publicKey.getParams()
              // passport.putInt("cofactor", ecParams.getCofactor())
              // passport.putString("curve", ecParams.getCurve().toString())
              // passport.putString("generator", ecParams.getGenerator().toString())
              // passport.putString("order", ecParams.getOrder().toString())
              // if (ecParams is ECNamedCurveSpec) {
              //     passport.putString("curveName", ecParams.getName())
              // }
  
            //   Old one, probably wrong:
            //     passport.putString("curveName", (publicKey.parameters as ECNamedCurveSpec).name)
            //     passport.putString("curveName", (publicKey.parameters.algorithm)) or maybe this
                passport.putString("publicKeyQ", publicKey.q.toString())
            }

            passport.putString("dataGroupHashes", gson.toJson(sodFile.dataGroupHashes))
            passport.putString("eContent", gson.toJson(sodFile.eContent))
            passport.putString("encryptedDigest", gson.toJson(sodFile.encryptedDigest))

            // passport.putString("encapContentInfo", gson.toJson(sodFile.encapContentInfo))
            // passport.putString("contentInfo", gson.toJson(sodFile.contentInfo))
            passport.putString("digestAlgorithm", gson.toJson(sodFile.digestAlgorithm))
            passport.putString("signerInfoDigestAlgorithm", gson.toJson(sodFile.signerInfoDigestAlgorithm))
            passport.putString("digestEncryptionAlgorithm", gson.toJson(sodFile.digestEncryptionAlgorithm))
            passport.putString("LDSVersion", gson.toJson(sodFile.getLDSVersion()))
            passport.putString("unicodeVersion", gson.toJson(sodFile.unicodeVersion))


            // Get EncapContent (data group hashes) using reflection in Kotlin
            val getENC: Method = SODFile::class.java.getDeclaredMethod("getLDSSecurityObject", SignedData::class.java)
            getENC.isAccessible = true
            val signedDataField: Field = sodFile::class.java.getDeclaredField("signedData")
            signedDataField.isAccessible = true
            val signedData: SignedData = signedDataField.get(sodFile) as SignedData
            val ldsso: LDSSecurityObject = getENC.invoke(sodFile, signedData) as LDSSecurityObject

            passport.putString("encapContent", gson.toJson(ldsso.encoded))

            // Convert the document signing certificate to PEM format
            val docSigningCert = sodFile.docSigningCertificate
            val pemCert = "-----BEGIN CERTIFICATE-----\n" + Base64.encodeToString(docSigningCert.encoded, Base64.DEFAULT) + "-----END CERTIFICATE-----"
            passport.putString("documentSigningCertificate", pemCert)

            // passport.putString("getDocSigningCertificate", gson.toJson(sodFile.getDocSigningCertificate))
            // passport.putString("getIssuerX500Principal", gson.toJson(sodFile.getIssuerX500Principal))
            // passport.putString("getSerialNumber", gson.toJson(sodFile.getSerialNumber))
  
  
            // Another way to get signing time is to get into signedData.signerInfos, then search for the ICO identifier 1.2.840.113549.1.9.5 
            // passport.putString("signerInfos", gson.toJson(signedData.signerInfos))
            
            //   Log.d(TAG, "signedData.digestAlgorithms: ${gson.toJson(signedData.digestAlgorithms)}")
            //   Log.d(TAG, "signedData.signerInfos: ${gson.toJson(signedData.signerInfos)}")
            //   Log.d(TAG, "signedData.certificates: ${gson.toJson(signedData.certificates)}")
            
            // var quality = 100
            // val base64 = bitmap?.let { toBase64(it, quality) }
            // val photo = Arguments.createMap()
            // photo.putString("base64", base64 ?: "")
            // photo.putInt("width", bitmap?.width ?: 0)
            // photo.putInt("height", bitmap?.height ?: 0)
            // passport.putMap("photo", photo)
            // passport.putString("dg2File", gson.toJson(dg2File))
            
            eventMessageEmitter(Messages.COMPLETED)
            scanPromise?.resolve(passport)
            eventMessageEmitter(Messages.RESET)
            
            apduLogger.clearContext()
            
            resetState()
        }
    }

    private fun convertDate(input: String?): String? {
        if (input == null) {
            return null
        }
        return try {
            SimpleDateFormat("yyMMdd", Locale.US).format(SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(input)!!)
        } catch (e: ParseException) {
            // Log.w(RNPassportReaderModule::class.java.simpleName, e)
            null
        }
    }

    private fun eventMessageEmitter(message: String) {
        if (reactContext.hasActiveCatalystInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("NativeEvent", message)
        } else {
            Log.d(TAG, "Error")
        }
    }

    fun logAnalyticsEvent(eventName: String, params: Map<String, Any> = emptyMap()) {
        try {
            val logData = JSONObject()
            logData.put("level", "info")
            logData.put("category", "NFC")
            logData.put("message", "Analytics Event: $eventName")
            if (params.isNotEmpty()) {
                logData.put("data", JSONObject(Gson().toJson(params)))
            }
            
            // Send to React Native via logEvent emission using the same working approach
            emitLogEvent(logData.toString())
            
            // Also log to Android logs for debugging
            Log.d(TAG, "Analytics event: $eventName with params: $params")
        } catch (e: Exception) {
            Log.e(TAG, "Error logging analytics event", e)
        }
    }

    private fun logAnalyticsError(eventName: String, message: String) {
        try {
            val logData = JSONObject()
            logData.put("level", "error")
            logData.put("category", "NFC")
            logData.put("message", "Analytics Error: $message")
            logData.put("data", JSONObject().apply {
                put("event", eventName)
                put("error_description", message)
            })
            
            emitLogEvent(logData.toString())
            
            Log.e(TAG, "Analytics error: $eventName - $message")
        } catch (e: Exception) {
            Log.e(TAG, "Error logging analytics error", e)
        }
    }

    private fun emitLogEvent(message: String) {
        if (reactContext.hasActiveCatalystInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("logEvent", message)
        } else {
            Log.d(TAG, "Cannot emit logEvent - no active catalyst instance")
        }
    }

    @ReactMethod
    fun reset() {
        logAnalyticsEvent("nfc_scan_reset")
        apduLogger.clearContext()
        
        resetState()
    }
    
    /**
     * Generate a unique session ID for tracking passport reading sessions
     */
    private fun generateSessionId(): String {
        return "nfc_${System.currentTimeMillis()}_${UUID.randomUUID().toString().take(8)}"
    }

    companion object {
        private val TAG = RNPassportReaderModule::class.java.simpleName
        private const val PARAM_DOC_NUM = "documentNumber";
        private const val PARAM_DOB = "dateOfBirth";
        private const val PARAM_DOE = "dateOfExpiry";
        private const val PARAM_CAN = "canNumber";
        private const val PARAM_USE_CAN = "useCan";
        const val JPEG_DATA_URI_PREFIX = "data:image/jpeg;base64,"
        private const val KEY_IS_SUPPORTED = "isSupported"
        private var instance: RNPassportReaderModule? = null

        fun getInstance(): RNPassportReaderModule {
            return instance ?: throw IllegalStateException("RNPassportReaderModule instance is not initialized")
        }
    }
}
