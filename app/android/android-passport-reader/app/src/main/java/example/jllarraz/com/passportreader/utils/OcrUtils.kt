package example.jllarraz.com.passportreader.utils

import android.util.Log
import com.google.mlkit.vision.text.Text
import net.sf.scuba.data.Gender
import org.jmrtd.lds.icao.MRZInfo
import java.util.regex.Pattern

object OcrUtils {

    private val TAG = OcrUtils::class.java.simpleName

    private val REGEX_OLD_PASSPORT = "(?<documentNumber>[A-Z0-9<]{9})(?<checkDigitDocumentNumber>[0-9ILDSOG]{1})(?<nationality>[A-Z<]{3})(?<dateOfBirth>[0-9ILDSOG]{6})(?<checkDigitDateOfBirth>[0-9ILDSOG]{1})(?<sex>[FM<]){1}(?<expirationDate>[0-9ILDSOG]{6})(?<checkDigitExpiration>[0-9ILDSOG]{1})"
    private val REGEX_OLD_PASSPORT_CLEAN = "(?<documentNumber>[A-Z0-9<]{9})(?<checkDigitDocumentNumber>[0-9]{1})(?<nationality>[A-Z<]{3})(?<dateOfBirth>[0-9]{6})(?<checkDigitDateOfBirth>[0-9]{1})(?<sex>[FM<]){1}(?<expirationDate>[0-9]{6})(?<checkDigitExpiration>[0-9]{1})"
    private val REGEX_IP_PASSPORT_LINE_1 = "\\bIP[A-Z<]{3}[A-Z0-9<]{9}[0-9]{1}"
    private val REGEX_IP_PASSPORT_LINE_2 = "[0-9]{6}[0-9]{1}[FM<]{1}[0-9]{6}[0-9]{1}[A-Z<]{3}"

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
        fullRead = fullRead.toUpperCase()
        Log.d(TAG, "Read: $fullRead")
        val patternLineOldPassportType = Pattern.compile(REGEX_OLD_PASSPORT)
        val matcherLineOldPassportType = patternLineOldPassportType.matcher(fullRead)



        if (matcherLineOldPassportType.find()) {
            //Old passport format
            val line2 = matcherLineOldPassportType.group(0)
            var documentNumber = matcherLineOldPassportType.group(1)
            val checkDigitDocumentNumber = cleanDate(matcherLineOldPassportType.group(2)).toInt()
            val dateOfBirthDay = cleanDate(matcherLineOldPassportType.group(4))
            val expirationDate = cleanDate(matcherLineOldPassportType.group(7))

            val cleanDocumentNumber = cleanDocumentNumber(documentNumber, checkDigitDocumentNumber)
            if (cleanDocumentNumber!=null){
                val mrzInfo = createDummyMrz(documentNumber, dateOfBirthDay, expirationDate)
                callback.onMRZRead(mrzInfo, timeRequired)
            }else{
                //No success
                callback.onMRZReadFailure(timeRequired)
            }


        } else {
            //Try with the new IP passport type
            val patternLineIPassportTypeLine1 = Pattern.compile(REGEX_IP_PASSPORT_LINE_1)
            val matcherLineIPassportTypeLine1 = patternLineIPassportTypeLine1.matcher(fullRead)
            val patternLineIPassportTypeLine2 = Pattern.compile(REGEX_IP_PASSPORT_LINE_2)
            val matcherLineIPassportTypeLine2 = patternLineIPassportTypeLine2.matcher(fullRead)
            if (matcherLineIPassportTypeLine1.find() && matcherLineIPassportTypeLine2.find()) {
                val line1 = matcherLineIPassportTypeLine1.group(0)
                val line2 = matcherLineIPassportTypeLine2.group(0)
                var documentNumber = line1.substring(5, 14)
                val checkDigitDocumentNumber = line1.substring(14, 15).toInt()
                val dateOfBirthDay = line2.substring(0, 6)
                val expirationDate = line2.substring(8, 14)

                val cleanDocumentNumber = cleanDocumentNumber(documentNumber, checkDigitDocumentNumber)
                if (cleanDocumentNumber!=null){
                    val mrzInfo = createDummyMrz(documentNumber, dateOfBirthDay, expirationDate)
                    callback.onMRZRead(mrzInfo, timeRequired)
                }else{
                    //No success
                    callback.onMRZReadFailure(timeRequired)
                }
            } else {
                //No success
                callback.onMRZReadFailure(timeRequired)
            }
        }
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

    private fun createDummyMrz(documentNumber: String, dateOfBirthDay: String, expirationDate: String): MRZInfo {
        return MRZInfo(
            "P",
            "ESP",
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