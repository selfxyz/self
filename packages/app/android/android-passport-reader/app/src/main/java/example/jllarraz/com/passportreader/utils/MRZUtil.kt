package example.jllarraz.com.passportreader.utils


import org.jmrtd.lds.icao.MRZInfo

import java.util.ArrayList

object MRZUtil {

    val TAG = MRZUtil::class.java.simpleName

    private val PASSPORT_LINE_1 = "[P]{1}[A-Z<]{1}[A-Z<]{3}[A-Z0-9<]{39}$"
    private val PASSPORT_LINE_2 = "[A-Z0-9<]{9}[0-9]{1}[A-Z<]{3}[0-9]{6}[0-9]{1}[FM<]{1}[0-9]{6}[0-9]{1}[A-Z0-9<]{14}[0-9<]{1}[0-9]{1}$"

    var mLines1 = ArrayList<String>()
    var mLines2 = ArrayList<String>()

    val mrzInfo: MRZInfo
        @Throws(IllegalArgumentException::class)
        get() {
            val iteratorLine1 = mLines1.iterator()
            while (iteratorLine1.hasNext()) {
                val line1 = iteratorLine1.next()
                val iteratorLine2 = mLines2.iterator()
                while (iteratorLine2.hasNext()) {
                    val line2 = iteratorLine2.next()
                    try {
                        return MRZInfo(line1 + "\n" + line2)
                    } catch (e: Exception) {
                    }

                }
            }
            throw IllegalArgumentException("Unable to find a combination of lines that pass MRZ checksum")
        }


    @Throws(IllegalArgumentException::class)
    fun cleanString(mrz: String): String {
        val lines = mrz.split("\n".toRegex()).dropLastWhile { it.isEmpty() }.toTypedArray()
        if (lines.size > 2) {
            return cleanLine1(lines[0]) + "\n" + cleanLine2(lines[1])
        }
        throw IllegalArgumentException("Not enough lines")
    }

    @Throws(IllegalArgumentException::class)
    fun cleanLine1(line: String?): String {
        if (line == null || line.length != 44) {
            throw IllegalArgumentException("Line 1 doesnt have the right length")
        }
        val group1 = line.substring(0, 2)
        var group2 = line.substring(2, 5)
        val group3 = line.substring(5, line.length)

        group2 = replaceNumberWithAlfa(group2)


        return group1 + group2 + group3
    }

    @Throws(IllegalArgumentException::class)
    fun cleanLine2(line: String?): String {
        if (line == null || line.length != 44) {
            throw IllegalArgumentException("Line 2 doesnt have the right length")
        }

        val group1 = line.substring(0, 9)
        var group2 = line.substring(9, 10)
        var group3 = line.substring(10, 13)
        var group4 = line.substring(13, 19)
        var group5 = line.substring(19, 20)
        val group6 = line.substring(20, 21)
        var group7 = line.substring(21, 27)
        var group8 = line.substring(27, 28)
        val group9 = line.substring(28, 42)
        var group10 = line.substring(42, 43)
        var group11 = line.substring(43, 44)

        group2 = replaceAlfaWithNumber(group2)
        group3 = replaceNumberWithAlfa(group3)
        group4 = replaceAlfaWithNumber(group4)
        group5 = replaceAlfaWithNumber(group5)
        group7 = replaceAlfaWithNumber(group7)
        group8 = replaceAlfaWithNumber(group8)
        group10 = replaceAlfaWithNumber(group10)
        group11 = replaceAlfaWithNumber(group11)

        return group1 + group2 + group3 + group4 + group5 + group6 + group7 + group8 + group9 + group10 + group11
    }

    fun replaceNumberWithAlfa(str: String): String {
        var str = str
        str = str.replace("0".toRegex(), "O")
        str = str.replace("1".toRegex(), "I")
        str = str.replace("2".toRegex(), "Z")
        str = str.replace("5".toRegex(), "S")
        return str
    }

    fun replaceAlfaWithNumber(str: String): String {
        var str = str
        str = str.replace("O".toRegex(), "0")
        str = str.replace("I".toRegex(), "1")
        str = str.replace("Z".toRegex(), "2")
        str = str.replace("S".toRegex(), "5")
        return str
    }

    fun addLine1(line1: String) {
        if (!mLines1.contains(line1)) {
            mLines1.add(line1)
        }
    }

    fun addLine2(line2: String) {
        if (!mLines2.contains(line2)) {
            mLines2.add(line2)
        }
    }

    fun cleanStorage() {
        mLines1.clear()
        mLines2.clear()
    }
}
