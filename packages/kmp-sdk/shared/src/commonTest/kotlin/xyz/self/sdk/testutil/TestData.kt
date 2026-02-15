package xyz.self.sdk.testutil

import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject

object TestData {
    fun bridgeRequestJson(
        id: String = "req-1",
        domain: String = "haptic",
        method: String = "trigger",
        version: Int = 1,
        timestamp: Long = 1234567890,
    ): String =
        """{"type":"request","version":$version,"id":"$id","domain":"$domain","method":"$method","params":{},"timestamp":$timestamp}"""

    fun bridgeRequestJsonWithParams(
        id: String = "req-1",
        domain: String = "nfc",
        method: String = "scan",
        params: String = """{"passportNumber":"L898902C3"}""",
    ): String = """{"type":"request","version":1,"id":"$id","domain":"$domain","method":"$method","params":$params,"timestamp":123}"""

    val icaoTd3Line1 = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<" // 44 chars
    val icaoTd3Line2 = "L898902C36UTO6908061F0608156<<<<<<<<<<<<<<04" // 44 chars

    val icaoTd1Line1 = "I<UTOD231458907<<<<<<<<<<<<<<<" // 30 chars
    val icaoTd1Line2 = "7408122F1204159UTO<<<<<<<<<<<6" // 30 chars
    val icaoTd1Line3 = "ERIKSSON<<ANNA<MARIA<<<<<<<<<<" // 30 chars

    fun samplePassportScanResult() =
        buildJsonObject {
            put("documentType", JsonPrimitive("P"))
            put("issuingState", JsonPrimitive("UTO"))
            put("surname", JsonPrimitive("ERIKSSON"))
            put("givenNames", JsonPrimitive("ANNA MARIA"))
            put("documentNumber", JsonPrimitive("L898902C3"))
            put("nationality", JsonPrimitive("UTO"))
            put("dateOfBirth", JsonPrimitive("690806"))
            put("gender", JsonPrimitive("F"))
            put("dateOfExpiry", JsonPrimitive("060815"))
        }
}
