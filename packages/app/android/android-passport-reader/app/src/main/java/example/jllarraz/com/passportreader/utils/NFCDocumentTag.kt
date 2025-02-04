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
        return Single.fromCallable({
            var passport: Passport? = null
            var cardServiceException: Exception? = null

            var ps: PassportService? = null
            try {
                val nfc = IsoDep.get(tag)
                nfc.timeout = Math.max(nfc.timeout, 2000)
                val cs = CardService.getInstance(nfc)
                ps = PassportService(cs, PassportNFC.MAX_TRANSCEIVE_LENGTH_FOR_PACE, PassportNFC.MAX_TRANSCEIVE_LENGTH_FOR_SECURE_MESSAGING , PassportNFC.MAX_BLOCK_SIZE, false, true)
                ps.open()

                val passportNFC = PassportNFC(ps, mrtdTrustStore, mrzInfo, PassportNFC.MAX_BLOCK_SIZE)
                val verifySecurity = passportNFC.verifySecurity()
                val features = passportNFC.features

                passport = Passport()

                passport.featureStatus = passportNFC.features
                passport.verificationStatus = passportNFC.verificationStatus


                passport.sodFile = passportNFC.sodFile


                //Basic Information
                if (passportNFC.dg1File != null) {
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
                }

                //Picture
                if (passportNFC.dg2File != null) {
                    //Get the picture
                    try {
                        val faceImage = PassportNfcUtils.retrieveFaceImage(context, passportNFC.dg2File!!)
                        passport.face = faceImage
                    } catch (e: Exception) {
                        //Don't do anything
                        e.printStackTrace()
                    }

                }


                //Portrait
                //Get the picture
                if (passportNFC.dg5File != null) {
                    //Get the picture
                    try {
                        val faceImage = PassportNfcUtils.retrievePortraitImage(context, passportNFC.dg5File!!)
                        passport.portrait = faceImage
                    } catch (e: Exception) {
                        //Don't do anything
                        e.printStackTrace()
                    }

                }


                val dg11 = passportNFC.dg11File
                if (dg11 != null) {

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
                }


                //Finger prints
                //Get the pictures
                if (passportNFC.dg3File != null) {
                    //Get the picture
                    try {
                        val bitmaps = PassportNfcUtils.retrieveFingerPrintImage(context, passportNFC.dg3File!!)
                        passport.fingerprints = bitmaps
                    } catch (e: Exception) {
                        //Don't do anything
                        e.printStackTrace()
                    }

                }


                //Signature
                //Get the pictures
                if (passportNFC.dg7File != null) {
                    //Get the picture
                    try {
                        val bitmap = PassportNfcUtils.retrieveSignatureImage(context, passportNFC.dg7File!!)
                        passport.signature = bitmap
                    } catch (e: Exception) {
                        //Don't do anything
                        e.printStackTrace()
                    }

                }

                //Additional Document Details

                val dg12 = passportNFC.dg12File
                if (dg12 != null) {
                    val additionalDocumentDetails = AdditionalDocumentDetails()
                    additionalDocumentDetails.dateAndTimeOfPersonalization = dg12.dateAndTimeOfPersonalization
                    additionalDocumentDetails.dateOfIssue = dg12.dateOfIssue
                    additionalDocumentDetails.endorsementsAndObservations = dg12.endorsementsAndObservations
                    try {
                        val imageOfFront = dg12.imageOfFront
                        val bitmapImageOfFront = BitmapFactory.decodeByteArray(imageOfFront, 0, imageOfFront.size)
                        additionalDocumentDetails.imageOfFront = bitmapImageOfFront
                    } catch (e: Exception) {
                        Log.e(TAG, "Additional document image front: $e")
                    }

                    try {
                        val imageOfRear = dg12.imageOfRear
                        val bitmapImageOfRear = BitmapFactory.decodeByteArray(imageOfRear, 0, imageOfRear.size)
                        additionalDocumentDetails.imageOfRear = bitmapImageOfRear
                    } catch (e: Exception) {
                        Log.e(TAG, "Additional document image rear: $e")
                    }

                    additionalDocumentDetails.issuingAuthority = dg12.issuingAuthority
                    additionalDocumentDetails.namesOfOtherPersons = dg12.namesOfOtherPersons
                    additionalDocumentDetails.personalizationSystemSerialNumber = dg12.personalizationSystemSerialNumber
                    additionalDocumentDetails.taxOrExitRequirements = dg12.taxOrExitRequirements

                    passport.additionalDocumentDetails = additionalDocumentDetails
                }

                //TODO EAC
            } catch (e: Exception) {
                cardServiceException = e
            } finally {
                try {
                    ps?.close()
                } catch (ex: Exception) {
                    ex.printStackTrace()
                }
            }

            PassportDTO(passport, cardServiceException)
        })
            .doOnSubscribe{
                passportCallback.onPassportReadStart()
            }
            .subscribeOn(Schedulers.io()).observeOn(AndroidSchedulers.mainThread()).subscribe({ passportDTO ->
                if(passportDTO.cardServiceException!=null) {
                    val cardServiceException = passportDTO.cardServiceException
                    if (cardServiceException is AccessDeniedException) {
                        passportCallback.onAccessDeniedException(cardServiceException)
                    } else if (cardServiceException is BACDeniedException) {
                        passportCallback.onBACDeniedException(cardServiceException)
                    } else if (cardServiceException is PACEException) {
                        passportCallback.onPACEException(cardServiceException)
                    } else if (cardServiceException is CardServiceException) {
                        passportCallback.onCardException(cardServiceException)
                    } else {
                        passportCallback.onGeneralException(cardServiceException)
                    }
                } else {
                    passportCallback.onPassportRead(passportDTO.passport)
                }
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