// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import QKMRZParser

struct MrzResultMapper {
    static func toDictionary(_ result: QKMRZResult) -> [String: Any] {
        return [
            "documentType": result.documentType,
            "countryCode": result.countryCode,
            "surnames": result.surnames,
            "givenNames": result.givenNames,
            "documentNumber": result.documentNumber,
            "nationalityCountryCode": result.nationalityCountryCode,
            "dateOfBirth": result.birthdate?.description ?? "",
            "sex": result.sex ?? "",
            "expiryDate": result.expiryDate?.description ?? "",
            "personalNumber": result.personalNumber,
            "personalNumber2": result.personalNumber2 ?? "",
            "isDocumentNumberValid": result.isDocumentNumberValid,
            "isBirthdateValid": result.isBirthdateValid,
            "isExpiryDateValid": result.isExpiryDateValid,
            "isPersonalNumberValid": result.isPersonalNumberValid ?? false,
            "allCheckDigitsValid": result.allCheckDigitsValid
        ]
    }
}
