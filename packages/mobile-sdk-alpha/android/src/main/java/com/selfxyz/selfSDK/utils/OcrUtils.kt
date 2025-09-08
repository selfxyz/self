package com.selfxyz.selfSDK.utils

import android.util.Log
import com.google.mlkit.vision.text.Text
import net.sf.scuba.data.Gender
import org.jmrtd.lds.icao.MRZInfo
import java.util.regex.Pattern

object OcrUtils {

    private val TAG = OcrUtils::class.java.simpleName

    // TD3 (Passport) format patterns
    private val REGEX_OLD_PASSPORT = "(?<documentNumber>[A-Z0-9<]{9})(?<checkDigitDocumentNumber>[0-9ILDSOG]{1})(?<nationality>[A-Z<]{3})(?<dateOfBirth>[0-9ILDSOG]{6})(?<checkDigitDateOfBirth>[0-9ILDSOG]{1})(?<sex>[FM<]){1}(?<expirationDate>[0-9ILDSOG]{6})(?<checkDigitExpiration>[0-9ILDSOG]{1})"
    private val REGEX_OLD_PASSPORT_CLEAN = "(?<documentNumber>[A-Z0-9<]{9})(?<checkDigitDocumentNumber>[0-9]{1})(?<nationality>[A-Z<]{3})(?<dateOfBirth>[0-9]{6})(?<checkDigitDateOfBirth>[0-9]{1})(?<sex>[FM<]){1}(?<expirationDate>[0-9]{6})(?<checkDigitExpiration>[0-9]{1})"
    private val REGEX_IP_PASSPORT_LINE_1 = "\\bIP[A-Z<]{3}[A-Z0-9<]{9}[0-9]{1}"
    private val REGEX_IP_PASSPORT_LINE_2 = "[0-9]{6}[0-9]{1}[FM<]{1}[0-9]{6}[0-9]{1}[A-Z<]{3}"

    // TD1 (ID Card) format patterns
    private val REGEX_TD1_LINE1 = "(?<documentCode>[A-Z]{1}[A-Z0-9<]{1})(?<issuingState>[A-Z<]{3})(?<documentNumber>[A-Z0-9<]{9})(?<checkDigitDocumentNumber>[0-9]{1})(?<optionalData1>[A-Z0-9<]{15})"
    private val REGEX_TD1_LINE2 = "(?<dateOfBirth>[0-9]{6})(?<checkDigitDateOfBirth>[0-9]{1})(?<sex>[FM<]{1})(?<expirationDate>[0-9]{6})(?<checkDigitExpiration>[0-9]{1})(?<nationality>[A-Z<]{3})(?<optionalData2>[A-Z0-9<]{7})"
    private val REGEX_TD1_LINE3 ="(?<names>[A-Z<]{30})"

    // TD1 (ID Card)
    private val REGEX_ID_DOCUMENT_CODE = "(?<documentCode>[IP]{1}[DM<]{1})"
    private val REGEX_ID_DOCUMENT_NUMBER = "(ID)(?<country>[A-Z<]{3})(?<documentNumber>[A-Z0-9<]{9})(?<checkDigitDocumentNumber>[0-9]{1})"
    private val REGEX_ID_DATE_OF_BIRTH = "(?<dateOfBirth>[0-9]{6})(?<checkDigitDateOfBirth>[0-9]{1})(?<gender>[FM<]{1})"

    private val patternDocumentNumber = Pattern.compile(REGEX_ID_DOCUMENT_NUMBER)
    private val patternDateOfBirth = Pattern.compile(REGEX_ID_DATE_OF_BIRTH)
    private val patternDocumentCode = Pattern.compile(REGEX_ID_DOCUMENT_CODE)


    fun processOcr(
        results: Text,
        timeRequired: Long,
        callback: MRZCallback
    ){
        var fullRead = ""
        val blocks = results.textBlocks
        for (i in blocks.indices) {
            var temp = ""
            val lines = blocks[i].lines
            for (j in lines.indices) {
                //extract scanned text lines here
                //temp+=lines.get(j).getText().trim()+"-";
                temp += lines[j].text + "-"
            }
            temp = temp.replace("\r".toRegex(), "").replace("\n".toRegex(), "").replace("\t".toRegex(), "").replace(" ", "")
            fullRead += "$temp-"
        }
        // fullRead = fullRead.toUpperCase()
        fullRead = fullRead.uppercase()
        // Log.d(TAG, "Read: $fullRead")

        // We try with TD1 format first (ID Card)
        val patternTD1Line1 = Pattern.compile(REGEX_TD1_LINE1)
        val patternTD1Line2 = Pattern.compile(REGEX_TD1_LINE2)
        val patternTD1Line3 = Pattern.compile(REGEX_TD1_LINE3)


        val matcherTD1Line1 = patternTD1Line1.matcher(fullRead)
        val matcherTD1Line2 = patternTD1Line2.matcher(fullRead)
        val matcherTD1Line3 = patternTD1Line3.matcher(fullRead)

        val matcherDocumentCode = patternDocumentCode.matcher(fullRead)

        if (matcherDocumentCode.find() && matcherDocumentCode.group("documentCode") == "ID") {
            Log.d(TAG, "ID card found")

            val matcherDocumentNumber = patternDocumentNumber.matcher(fullRead)
            val matcherDateOfBirth = patternDateOfBirth.matcher(fullRead)

            val hasDocumentNumber = matcherDocumentNumber.find()
            val hasDateOfBirth = matcherDateOfBirth.find()

            val documentNumber = if (hasDocumentNumber) matcherDocumentNumber.group("documentNumber") else null
            val checkDigitDocumentNumber = if (hasDocumentNumber) matcherDocumentNumber.group("checkDigitDocumentNumber")?.toIntOrNull() else null
            val countryCode = if (hasDocumentNumber) matcherDocumentNumber.group("country") else null
            val dateOfBirth = if (hasDateOfBirth) matcherDateOfBirth.group("dateOfBirth") else null
            val checkDigitDateOfBirth = if (hasDateOfBirth) matcherDateOfBirth.group("checkDigitDateOfBirth")?.toIntOrNull() else null
            val gender = if (hasDateOfBirth) matcherDateOfBirth.group("gender") else null

            val expirationDate: String? = if (!countryCode.isNullOrEmpty()) {
                val expirationDateRegex = "(?<expirationDate>[0-9]{6})(?<checkDigitExpiration>[0-9]{1})" + Pattern.quote(countryCode)
                val patternExpirationDate = Pattern.compile(expirationDateRegex)
                val matcherExpirationDate = patternExpirationDate.matcher(fullRead)
                if (matcherExpirationDate.find()) matcherExpirationDate.group("expirationDate") else null
            } else null

            // Only proceed if all required fields are present and non-empty
            if (!countryCode.isNullOrEmpty() && !documentNumber.isNullOrEmpty() && !dateOfBirth.isNullOrEmpty() && !expirationDate.isNullOrEmpty() && checkDigitDocumentNumber != null) {
                val cleanDocumentNumber = cleanDocumentNumber(documentNumber, checkDigitDocumentNumber)
                Log.d(TAG, "cleanDocumentNumber")
                if (cleanDocumentNumber != null) {
                    val mrzInfo = createDummyMrz("ID", countryCode, cleanDocumentNumber, dateOfBirth, expirationDate)
                    // Log.d(TAG, "MRZ-TD1: $mrzInfo")
                    callback.onMRZRead(mrzInfo, timeRequired)
                    return
                }
            } else {
                if (countryCode.isNullOrEmpty()) Log.d(TAG, "Missing or invalid countryCode")
                if (documentNumber.isNullOrEmpty()) Log.d(TAG, "Missing or invalid documentNumber")
                if (dateOfBirth.isNullOrEmpty()) Log.d(TAG, "Missing or invalid dateOfBirth")
                if (expirationDate.isNullOrEmpty()) Log.d(TAG, "Missing or invalid expirationDate")
                if (checkDigitDocumentNumber == null) Log.d(TAG, "Missing or invalid checkDigitDocumentNumber")
            }
        }

        if (matcherTD1Line1.find() && matcherTD1Line2.find()) {
            Log.d(TAG, "TD1Line1 and TD1Line2 found")
            val documentNumber = matcherTD1Line1.group("documentNumber")
            val checkDigitDocumentNumber = matcherTD1Line1.group("checkDigitDocumentNumber").toInt()
            val dateOfBirth = matcherTD1Line2.group("dateOfBirth")
            val expirationDate = matcherTD1Line2.group("expirationDate")
            val documentType = matcherTD1Line1.group("documentCode")
            val issuingState = matcherTD1Line1.group("issuingState")

            val cleanDocumentNumber = cleanDocumentNumber(documentNumber, checkDigitDocumentNumber)
            if (cleanDocumentNumber != null) {
                val mrzInfo = createDummyMrz(documentType, issuingState, cleanDocumentNumber, dateOfBirth, expirationDate)
                // Log.d(TAG, "cleanDocumentNumber")
                callback.onMRZRead(mrzInfo, timeRequired)
                return
            }
        }

        // If not TD1 we try with TD3 (Passport) format
        val patternLineOldPassportType = Pattern.compile(REGEX_OLD_PASSPORT)
        val matcherLineOldPassportType = patternLineOldPassportType.matcher(fullRead)

        if (matcherLineOldPassportType.find()) {
            //Old passport format
            val line2 = matcherLineOldPassportType.group(0)
            var documentNumber = matcherLineOldPassportType.group(1)
            val checkDigitDocumentNumber = cleanDate(matcherLineOldPassportType.group(2)).toInt()
            val dateOfBirthDay = cleanDate(matcherLineOldPassportType.group(4))
            val expirationDate = cleanDate(matcherLineOldPassportType.group(7))
            val countryCode = matcherLineOldPassportType.group(3)

            val cleanDocumentNumber = cleanDocumentNumber(documentNumber, checkDigitDocumentNumber)
            if (cleanDocumentNumber!=null){
                val mrzInfo = createDummyMrz("P", countryCode, cleanDocumentNumber, dateOfBirthDay, expirationDate)
                // Log.d(TAG, "MRZ: $mrzInfo")
                callback.onMRZRead(mrzInfo, timeRequired)
                return
            }
        }

        //Try with the new IP passport type
        val patternLineIPassportTypeLine1 = Pattern.compile(REGEX_IP_PASSPORT_LINE_1)
        val matcherLineIPassportTypeLine1 = patternLineIPassportTypeLine1.matcher(fullRead)
        val patternLineIPassportTypeLine2 = Pattern.compile(REGEX_IP_PASSPORT_LINE_2)
        val matcherLineIPassportTypeLine2 = patternLineIPassportTypeLine2.matcher(fullRead)
        if (matcherLineIPassportTypeLine1.find() && matcherLineIPassportTypeLine2.find()) {
            val line1 = matcherLineIPassportTypeLine1.group(0)
            val line2 = matcherLineIPassportTypeLine2.group(0)
            val documentNumber = line1.substring(5, 14)
            val checkDigitDocumentNumber = line1.substring(14, 15).toInt()
            val countryCode = line1.substring(2, 5)
            val dateOfBirthDay = line2.substring(0, 6)
            val expirationDate = line2.substring(8, 14)

            val cleanDocumentNumber = cleanDocumentNumber(documentNumber, checkDigitDocumentNumber)
            if (cleanDocumentNumber != null) {
                val mrzInfo = createDummyMrz("P", countryCode, cleanDocumentNumber, dateOfBirthDay, expirationDate)
                callback.onMRZRead(mrzInfo, timeRequired)
                return
            }
        }

        //No success with any format
        callback.onMRZReadFailure(timeRequired)
    }

    private fun cleanDocumentNumber(documentNumber: String, checkDigit:Int):String?{
        //first we replace all O per 0
        var tempDcumentNumber = documentNumber.replace("O".toRegex(), "0")
        //Calculate check digit of the document number
        var checkDigitCalculated = MRZInfo.checkDigit(tempDcumentNumber).toString().toInt()
        if (checkDigit == checkDigitCalculated) {
            //If check digits match we return the document number
            return tempDcumentNumber
        }
        //if no match, we try to replace once at a time the first 0 per O as the alpha part comes first, and check if the digits match
        var indexOfZero = tempDcumentNumber.indexOf("0")
        while (indexOfZero>-1) {
            checkDigitCalculated = MRZInfo.checkDigit(tempDcumentNumber).toString().toInt()
            if (checkDigit != checkDigitCalculated) {
                //Some countries like Spain uses a letter O before the numeric part
                indexOfZero = tempDcumentNumber.indexOf("0")
                tempDcumentNumber = tempDcumentNumber.replaceFirst("0", "O")
            }else{
                return tempDcumentNumber
            }
        }
        return null
    }

    private fun createDummyMrz(
        documentType: String,
        issuingState: String = "ESP",
        documentNumber: String,
        dateOfBirthDay: String,
        expirationDate: String,
        nationality: String = "ESP"
    ): MRZInfo {
        return MRZInfo(
            documentType,
            issuingState,
            "DUMMY",
            "DUMMY",
            documentNumber,
            "ESP",
            dateOfBirthDay,
            Gender.MALE,
            expirationDate,
            ""
        )
    }

    private fun cleanDate(date:String):String{
        var tempDate = date
        tempDate = tempDate.replace("I".toRegex(), "1")
        tempDate = tempDate.replace("L".toRegex(), "1")
        tempDate = tempDate.replace("D".toRegex(), "0")
        tempDate = tempDate.replace("O".toRegex(), "0")
        tempDate = tempDate.replace("S".toRegex(), "5")
        tempDate = tempDate.replace("G".toRegex(), "6")
        return tempDate
    }

    interface MRZCallback {
        fun onMRZRead(mrzInfo: MRZInfo, timeRequired: Long)
        fun onMRZReadFailure(timeRequired: Long)
        fun onFailure(e: Exception, timeRequired: Long)
    }
}
