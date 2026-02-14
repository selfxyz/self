package xyz.self.sdk.models

object MrzKeyUtils {

    private val CHAR_VALUES: Map<Char, Int> = buildMap {
        for (i in 0..9) put('0' + i, i)
        put('<', 0)
        put(' ', 0)
        for (i in 0..25) put('A' + i, 10 + i)
    }

    private val MULTIPLIERS = intArrayOf(7, 3, 1)

    fun calcCheckSum(input: String): Int {
        var sum = 0
        for ((i, ch) in input.uppercase().withIndex()) {
            val value = CHAR_VALUES[ch]
                ?: throw IllegalArgumentException(
                    "Invalid MRZ character '$ch' at position $i in '$input'. " +
                        "Only digits (0-9), letters (A-Z), '<', and space are allowed."
                )
            sum += value * MULTIPLIERS[i % 3]
        }
        return sum % 10
    }

    fun computeMrzKey(
        passportNumber: String,
        dateOfBirth: String,
        dateOfExpiry: String,
    ): String {
        val pn = passportNumber.padEnd(9, '<')
        val dob = dateOfBirth.padEnd(6, '<')
        val doe = dateOfExpiry.padEnd(6, '<')

        val pnCheck = calcCheckSum(pn)
        val dobCheck = calcCheckSum(dob)
        val doeCheck = calcCheckSum(doe)

        return "$pn$pnCheck$dob$dobCheck$doe$doeCheck"
    }
}
