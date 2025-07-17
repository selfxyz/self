package example.jllarraz.com.passportreader.utils

import android.content.Context
import android.graphics.BitmapFactory
import android.nfc.Tag
import android.nfc.tech.IsoDep
import android.util.Log
import example.jllarraz.com.passportreader.data.AdditionalDocumentDetails
import example.jllarraz.com.passportreader.data.AdditionalPersonDetails
import example.jllarraz.com.passportreader.data.Passport
import example.jllarraz.com.passportreader.data.PersonDetails
import io.reactivex.Single
import io.reactivex.android.schedulers.AndroidSchedulers
import io.reactivex.disposables.Disposable
import io.reactivex.schedulers.Schedulers
import net.sf.scuba.smartcards.CardService
import net.sf.scuba.smartcards.CardServiceException
import org.jmrtd.*
import org.jmrtd.lds.icao.DG1File
import org.jmrtd.lds.icao.MRZInfo
import java.security.Security

class NFCDocumentTag {

    fun handleTag(context: Context, tag: Tag, mrzInfo: MRZInfo, mrtdTrustStore: MRTDTrustStore, passportCallback: PassportCallback):Disposable{
        Log.d(TAG, "handleTag: Starting tag processing")
        Log.d(TAG, "handleTag: Context: $context")
        Log.d(TAG, "handleTag: Tag: $tag")
        Log.d(TAG, "handleTag: MRZ Info: ${mrzInfo.documentNumber}")
        Log.d(TAG, "handleTag: MRTD Trust Store: $mrtdTrustStore")

        return Single.fromCallable({
            Log.d(TAG, "handleTag: Single callable started on background thread")
            var passport: Passport? = null
            var cardServiceException: Exception? = null

            var ps: PassportService? = null
            try {
                Log.d(TAG, "handleTag: Getting IsoDep from tag")
                val nfc = IsoDep.get(tag)
                Log.d(TAG, "handleTag: IsoDep instance: $nfc")
                Log.d(TAG, "handleTag: Initial timeout: ${nfc.timeout}")

                nfc.timeout = Math.max(nfc.timeout, 2000)
                Log.d(TAG, "handleTag: Set timeout to: ${nfc.timeout}")

                Log.d(TAG, "handleTag: Creating CardService")
                val cs = CardService.getInstance(nfc)
                Log.d(TAG, "handleTag: CardService created: $cs")

                Log.d(TAG, "handleTag: Creating PassportService")
                ps = PassportService(cs, PassportNFC.MAX_TRANSCEIVE_LENGTH_FOR_PACE, PassportNFC.MAX_TRANSCEIVE_LENGTH_FOR_SECURE_MESSAGING , PassportNFC.MAX_BLOCK_SIZE, false, true)
                Log.d(TAG, "handleTag: PassportService created: $ps")

                Log.d(TAG, "handleTag: Opening PassportService")
                ps.open()
                Log.d(TAG, "handleTag: PassportService opened successfully")

                Log.d(TAG, "handleTag: Creating PassportNFC instance")
                val passportNFC = PassportNFC(ps, mrtdTrustStore, mrzInfo, PassportNFC.MAX_BLOCK_SIZE)
                Log.d(TAG, "handleTag: PassportNFC created: $passportNFC")

                Log.d(TAG, "handleTag: Verifying security")
                val verifySecurity = passportNFC.verifySecurity()
                Log.d(TAG, "handleTag: Security verification result: $verifySecurity")

                val features = passportNFC.features
                Log.d(TAG, "handleTag: Passport features: $features")

                passport = Passport()
                Log.d(TAG, "handleTag: Created new Passport instance")

                passport.featureStatus = passportNFC.features
                passport.verificationStatus = passportNFC.verificationStatus
                Log.d(TAG, "handleTag: Set feature and verification status")

                passport.sodFile = passportNFC.sodFile
                Log.d(TAG, "handleTag: Set SOD file")


                //Basic Information
                Log.d(TAG, "handleTag: Processing DG1 file (basic information)")
                if (passportNFC.dg1File != null) {
                    Log.d(TAG, "handleTag: DG1 file available, extracting MRZ info")
                    val mrzInfo = (passportNFC.dg1File as DG1File).mrzInfo
                    val personDetails = PersonDetails()
                    personDetails.dateOfBirth = mrzInfo.dateOfBirth
                    personDetails.dateOfExpiry = mrzInfo.dateOfExpiry
                    personDetails.documentCode = mrzInfo.documentCode
                    personDetails.documentNumber = mrzInfo.documentNumber
                    personDetails.optionalData1 = mrzInfo.optionalData1
                    personDetails.optionalData2 = mrzInfo.optionalData2
                    personDetails.issuingState = mrzInfo.issuingState
                    personDetails.primaryIdentifier = mrzInfo.primaryIdentifier
                    personDetails.secondaryIdentifier = mrzInfo.secondaryIdentifier
                    personDetails.nationality = mrzInfo.nationality
                    personDetails.gender = mrzInfo.gender
                    passport.personDetails = personDetails
                    Log.d(TAG, "handleTag: Person details extracted successfully")
                } else {
                    Log.w(TAG, "handleTag: DG1 file not available")
                }

                //Picture
                Log.d(TAG, "handleTag: Processing DG2 file (face image)")
                if (passportNFC.dg2File != null) {
                    //Get the picture
                    try {
                        Log.d(TAG, "handleTag: Retrieving face image from DG2")
                        val faceImage = PassportNfcUtils.retrieveFaceImage(context, passportNFC.dg2File!!)
                        passport.face = faceImage
                        Log.d(TAG, "handleTag: Face image retrieved successfully")
                    } catch (e: Exception) {
                        Log.e(TAG, "handleTag: Error retrieving face image", e)
                        //Don't do anything
                        e.printStackTrace()
                    }

                } else {
                    Log.w(TAG, "handleTag: DG2 file not available")
                }


                //Portrait
                //Get the picture
                Log.d(TAG, "handleTag: Processing DG5 file (portrait image)")
                if (passportNFC.dg5File != null) {
                    //Get the picture
                    try {
                        Log.d(TAG, "handleTag: Retrieving portrait image from DG5")
                        val faceImage = PassportNfcUtils.retrievePortraitImage(context, passportNFC.dg5File!!)
                        passport.portrait = faceImage
                        Log.d(TAG, "handleTag: Portrait image retrieved successfully")
                    } catch (e: Exception) {
                        Log.e(TAG, "handleTag: Error retrieving portrait image", e)
                        //Don't do anything
                        e.printStackTrace()
                    }

                } else {
                    Log.w(TAG, "handleTag: DG5 file not available")
                }


                Log.d(TAG, "handleTag: Processing DG11 file (additional person details)")
                val dg11 = passportNFC.dg11File
                if (dg11 != null) {
                    Log.d(TAG, "handleTag: DG11 file available, extracting additional person details")

                    val additionalPersonDetails = AdditionalPersonDetails()
                    additionalPersonDetails.custodyInformation = dg11.custodyInformation
                    additionalPersonDetails.fullDateOfBirth = dg11.fullDateOfBirth
                    additionalPersonDetails.nameOfHolder = dg11.nameOfHolder
                    additionalPersonDetails.otherNames = dg11.otherNames
                    additionalPersonDetails.otherNames = dg11.otherNames
                    additionalPersonDetails.otherValidTDNumbers = dg11.otherValidTDNumbers
                    additionalPersonDetails.permanentAddress = dg11.permanentAddress
                    additionalPersonDetails.personalNumber = dg11.personalNumber
                    additionalPersonDetails.personalSummary = dg11.personalSummary
                    additionalPersonDetails.placeOfBirth = dg11.placeOfBirth
                    additionalPersonDetails.profession = dg11.profession
                    additionalPersonDetails.proofOfCitizenship = dg11.proofOfCitizenship
                    additionalPersonDetails.tag = dg11.tag
                    additionalPersonDetails.tagPresenceList = dg11.tagPresenceList
                    additionalPersonDetails.telephone = dg11.telephone
                    additionalPersonDetails.title = dg11.title

                    passport.additionalPersonDetails = additionalPersonDetails
                    Log.d(TAG, "handleTag: Additional person details extracted successfully")
                } else {
                    Log.w(TAG, "handleTag: DG11 file not available")
                }


                //Finger prints
                //Get the pictures
                Log.d(TAG, "handleTag: Processing DG3 file (fingerprints)")
                if (passportNFC.dg3File != null) {
                    //Get the picture
                    try {
                        Log.d(TAG, "handleTag: Retrieving fingerprint images from DG3")
                        val bitmaps = PassportNfcUtils.retrieveFingerPrintImage(context, passportNFC.dg3File!!)
                        passport.fingerprints = bitmaps
                        Log.d(TAG, "handleTag: Fingerprint images retrieved successfully")
                    } catch (e: Exception) {
                        Log.e(TAG, "handleTag: Error retrieving fingerprint images", e)
                        //Don't do anything
                        e.printStackTrace()
                    }

                } else {
                    Log.w(TAG, "handleTag: DG3 file not available")
                }


                //Signature
                //Get the pictures
                Log.d(TAG, "handleTag: Processing DG7 file (signature)")
                if (passportNFC.dg7File != null) {
                    //Get the picture
                    try {
                        Log.d(TAG, "handleTag: Retrieving signature image from DG7")
                        val bitmap = PassportNfcUtils.retrieveSignatureImage(context, passportNFC.dg7File!!)
                        passport.signature = bitmap
                        Log.d(TAG, "handleTag: Signature image retrieved successfully")
                    } catch (e: Exception) {
                        Log.e(TAG, "handleTag: Error retrieving signature image", e)
                        //Don't do anything
                        e.printStackTrace()
                    }

                } else {
                    Log.w(TAG, "handleTag: DG7 file not available")
                }

                //Additional Document Details
                Log.d(TAG, "handleTag: Processing DG12 file (additional document details)")
                val dg12 = passportNFC.dg12File
                if (dg12 != null) {
                    Log.d(TAG, "handleTag: DG12 file available, extracting additional document details")
                    val additionalDocumentDetails = AdditionalDocumentDetails()
                    additionalDocumentDetails.dateAndTimeOfPersonalization = dg12.dateAndTimeOfPersonalization
                    additionalDocumentDetails.dateOfIssue = dg12.dateOfIssue
                    additionalDocumentDetails.endorsementsAndObservations = dg12.endorsementsAndObservations
                    try {
                        val imageOfFront = dg12.imageOfFront
                        val bitmapImageOfFront = BitmapFactory.decodeByteArray(imageOfFront, 0, imageOfFront.size)
                        additionalDocumentDetails.imageOfFront = bitmapImageOfFront
                        Log.d(TAG, "handleTag: Front document image processed")
                    } catch (e: Exception) {
                        Log.e(TAG, "Additional document image front: $e")
                    }

                    try {
                        val imageOfRear = dg12.imageOfRear
                        val bitmapImageOfRear = BitmapFactory.decodeByteArray(imageOfRear, 0, imageOfRear.size)
                        additionalDocumentDetails.imageOfRear = bitmapImageOfRear
                        Log.d(TAG, "handleTag: Rear document image processed")
                    } catch (e: Exception) {
                        Log.e(TAG, "Additional document image rear: $e")
                    }

                    additionalDocumentDetails.issuingAuthority = dg12.issuingAuthority
                    additionalDocumentDetails.namesOfOtherPersons = dg12.namesOfOtherPersons
                    additionalDocumentDetails.personalizationSystemSerialNumber = dg12.personalizationSystemSerialNumber
                    additionalDocumentDetails.taxOrExitRequirements = dg12.taxOrExitRequirements

                    passport.additionalDocumentDetails = additionalDocumentDetails
                    Log.d(TAG, "handleTag: Additional document details extracted successfully")
                } else {
                    Log.w(TAG, "handleTag: DG12 file not available")
                }

                Log.d(TAG, "handleTag: Passport processing completed successfully")
                //TODO EAC
            } catch (e: Exception) {
                Log.e(TAG, "handleTag: Exception occurred during passport processing", e)
                cardServiceException = e
            } finally {
                try {
                    if (ps != null) {
                        Log.d(TAG, "handleTag: Closing PassportService")
                        ps?.close()
                        Log.d(TAG, "handleTag: PassportService closed")
                    }
                } catch (ex: Exception) {
                    Log.e(TAG, "handleTag: Error closing PassportService", ex)
                    ex.printStackTrace()
                }
            }

            Log.d(TAG, "handleTag: Creating PassportDTO with passport: $passport, exception: $cardServiceException")
            PassportDTO(passport, cardServiceException)
        })
            .doOnSubscribe{
                Log.d(TAG, "handleTag: RxJava subscription started")
                passportCallback.onPassportReadStart()
            }
            .subscribeOn(Schedulers.io()).observeOn(AndroidSchedulers.mainThread()).subscribe({ passportDTO ->
                Log.d(TAG, "handleTag: RxJava onNext called with PassportDTO")
                Log.d(TAG, "handleTag: Passport: ${passportDTO.passport}")
                Log.d(TAG, "handleTag: Exception: ${passportDTO.cardServiceException}")

                if(passportDTO.cardServiceException!=null) {
                    val cardServiceException = passportDTO.cardServiceException
                    Log.e(TAG, "handleTag: Processing card service exception: $cardServiceException")
                    if (cardServiceException is AccessDeniedException) {
                        Log.e(TAG, "handleTag: AccessDeniedException")
                        passportCallback.onAccessDeniedException(cardServiceException)
                    } else if (cardServiceException is BACDeniedException) {
                        Log.e(TAG, "handleTag: BACDeniedException")
                        passportCallback.onBACDeniedException(cardServiceException)
                    } else if (cardServiceException is PACEException) {
                        Log.e(TAG, "handleTag: PACEException")
                        passportCallback.onPACEException(cardServiceException)
                    } else if (cardServiceException is CardServiceException) {
                        Log.e(TAG, "handleTag: CardServiceException")
                        passportCallback.onCardException(cardServiceException)
                    } else {
                        Log.e(TAG, "handleTag: GeneralException")
                        passportCallback.onGeneralException(cardServiceException)
                    }
                } else {
                    Log.d(TAG, "handleTag: No exception, calling onPassportRead")
                    passportCallback.onPassportRead(passportDTO.passport)
                }
                Log.d(TAG, "handleTag: Calling onPassportReadFinish")
                passportCallback.onPassportReadFinish()
            })
    }

    data class PassportDTO(val passport: Passport? = null, val cardServiceException: Exception? = null)

    interface PassportCallback {
        fun onPassportReadStart()
        fun onPassportReadFinish()
        fun onPassportRead(passport: Passport?)
        fun onAccessDeniedException(exception: AccessDeniedException)
        fun onBACDeniedException(exception: BACDeniedException)
        fun onPACEException(exception: PACEException)
        fun onCardException(exception: CardServiceException)
        fun onGeneralException(exception: Exception?)
    }

    companion object {

        private val TAG = NFCDocumentTag::class.java.simpleName

        init {
            Security.insertProviderAt(org.spongycastle.jce.provider.BouncyCastleProvider(), 1)
        }

        private val EMPTY_TRIED_BAC_ENTRY_LIST = emptyList<Any>()
        private val EMPTY_CERTIFICATE_CHAIN = emptyList<Any>()
    }
}
