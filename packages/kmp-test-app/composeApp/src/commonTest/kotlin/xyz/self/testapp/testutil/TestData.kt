// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.testapp.testutil

import xyz.self.testapp.models.PassportData

object TestData {
    val validPassport =
        PassportData(
            passportNumber = "L898902C3",
            dateOfBirth = "690806",
            dateOfExpiry = "060815",
        )

    val emptyPassport = PassportData()

    val invalidPassport =
        PassportData(
            passportNumber = "AB123",
            dateOfBirth = "69080", // wrong length
            dateOfExpiry = "060815",
        )
}
