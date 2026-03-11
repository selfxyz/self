// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation
import React
#if !E2E_TESTING
import NFCPassportReader
import Security

@available(iOS 13, macOS 10.15, *)
extension CertificateType {
    func stringValue() -> String {
        switch self {
            case .documentSigningCertificate:
                return "documentSigningCertificate"
            case .issuerSigningCertificate:
                return "issuerSigningCertificate"
        }
    }
}
#endif

extension Dictionary {
    func mapKeys<T: Hashable>(_ transform: (Key) -> T) -> Dictionary<T, Value> {
        Dictionary<T, Value>(uniqueKeysWithValues: map { (transform($0.key), $0.value) })
    }
}

#if !E2E_TESTING
@available(iOS 15, *)
enum PassportReaderCore {
    static func getMRZKey(passportNumber: String, dateOfBirth: String, dateOfExpiry: String) -> String {
        let pptNr = pad(passportNumber, fieldLength: 9)
        let dob = pad(dateOfBirth, fieldLength: 6)
        let exp = pad(dateOfExpiry, fieldLength: 6)

        let passportNrChksum = calcCheckSum(pptNr)
        let dateOfBirthChksum = calcCheckSum(dob)
        let expiryDateChksum = calcCheckSum(exp)

        return "\(pptNr)\(passportNrChksum)\(dob)\(dateOfBirthChksum)\(exp)\(expiryDateChksum)"
    }

    static func pad(_ value: String, fieldLength: Int) -> String {
        let paddedValue = (value + String(repeating: "<", count: fieldLength)).prefix(fieldLength)
        return String(paddedValue)
    }

    static func calcCheckSum(_ checkString: String) -> Int {
        let characterDict = [
            "0": "0", "1": "1", "2": "2", "3": "3", "4": "4",
            "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
            "<": "0", " ": "0",
            "A": "10", "B": "11", "C": "12", "D": "13", "E": "14",
            "F": "15", "G": "16", "H": "17", "I": "18", "J": "19",
            "K": "20", "L": "21", "M": "22", "N": "23", "O": "24",
            "P": "25", "Q": "26", "R": "27", "S": "28", "T": "29",
            "U": "30", "V": "31", "W": "32", "X": "33", "Y": "34",
            "Z": "35",
        ]

        var sum = 0
        var m = 0
        let multipliers: [Int] = [7, 3, 1]

        for c in checkString {
            guard let lookup = characterDict["\(c)"], let number = Int(lookup) else {
                return 0
            }

            sum += number * multipliers[m]
            m = (m + 1) % 3
        }

        return sum % 10
    }

    static func scanPassport(
        reader: NFCPassportReader.PassportReader,
        passportNumber: String,
        dateOfBirth: String,
        dateOfExpiry: String,
        canNumber: String,
        useCan: Bool,
        skipPACE: Bool,
        skipCA: Bool,
        extendedMode: Bool,
        usePacePolling: Bool,
        onStart: (() -> Void)? = nil,
        onSuccess: (() -> Void)? = nil,
        onFailure: ((Error) -> Void)? = nil,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let customMessageHandler: (NFCViewDisplayMessage) -> String? = { displayMessage in
            switch displayMessage {
                case .requestPresentPassport:
                    return "Hold your iPhone against an NFC enabled passport."
                default:
                    return nil
            }
        }

        onStart?()

        Task {
            do {
                let password: String
                let passwordType: PACEPasswordType

                if useCan {
                    if canNumber.count != 6 {
                        reject("E_PASSPORT_READ", "CAN number must be 6 digits", nil)
                        return
                    }

                    password = canNumber
                    passwordType = .can
                } else {
                    password = getMRZKey(
                        passportNumber: passportNumber,
                        dateOfBirth: dateOfBirth,
                        dateOfExpiry: dateOfExpiry
                    )
                    passwordType = .mrz
                }

                let passport = try await reader.readPassport(
                    password: password,
                    type: passwordType,
                    tags: [.COM, .DG1, .SOD],
                    skipCA: skipCA,
                    skipPACE: skipPACE,
                    useExtendedMode: extendedMode,
                    usePacePolling: usePacePolling,
                    customDisplayMessage: customMessageHandler
                )

                var ret = [String: String]()
                ret["documentType"] = passport.documentType
                ret["documentSubType"] = passport.documentSubType
                ret["documentNumber"] = passport.documentNumber
                ret["issuingAuthority"] = passport.issuingAuthority
                ret["documentExpiryDate"] = passport.documentExpiryDate
                ret["dateOfBirth"] = passport.dateOfBirth
                ret["gender"] = passport.gender
                ret["nationality"] = passport.nationality
                ret["lastName"] = passport.lastName
                ret["firstName"] = passport.firstName
                ret["passportMRZ"] = passport.passportMRZ
                ret["placeOfBirth"] = passport.placeOfBirth
                ret["residenceAddress"] = passport.residenceAddress
                ret["phoneNumber"] = passport.phoneNumber
                ret["personalNumber"] = passport.personalNumber

                if let serializedDocumentSigningCertificate = serializeX509Wrapper(passport.documentSigningCertificate) {
                    ret["documentSigningCertificate"] = serializedDocumentSigningCertificate
                }

                if let serializedCountrySigningCertificate = serializeX509Wrapper(passport.countrySigningCertificate) {
                    ret["countrySigningCertificate"] = serializedCountrySigningCertificate
                }

                ret["LDSVersion"] = passport.LDSVersion
                ret["dataGroupsPresent"] = passport.dataGroupsPresent.joined(separator: ", ")

                do {
                    let dataGroupHashesDict = passport.dataGroupHashes.mapKeys { "\($0)" }
                    let serializableDataGroupHashes = dataGroupHashesDict.mapValues { convertDataGroupHashToSerializableFormat($0) }
                    let dataGroupHashesData = try JSONSerialization.data(withJSONObject: serializableDataGroupHashes, options: [])
                    let dataGroupHashesJsonString = String(data: dataGroupHashesData, encoding: .utf8) ?? ""
                    ret["dataGroupHashes"] = dataGroupHashesJsonString
                } catch {
                }

                ret["passportCorrectlySigned"] = String(passport.passportCorrectlySigned)
                ret["documentSigningCertificateVerified"] = String(passport.documentSigningCertificateVerified)
                ret["passportDataNotTampered"] = String(passport.passportDataNotTampered)
                ret["activeAuthenticationPassed"] = String(passport.activeAuthenticationPassed)
                ret["activeAuthenticationChallenge"] = encodeByteArrayToHexString(passport.activeAuthenticationChallenge)
                ret["activeAuthenticationSignature"] = encodeByteArrayToHexString(passport.activeAuthenticationSignature)
                ret["verificationErrors"] = encodeErrors(passport.verificationErrors).joined(separator: ", ")
                ret["isPACESupported"] = String(passport.isPACESupported)
                ret["isChipAuthenticationSupported"] = String(passport.isChipAuthenticationSupported)

                do {
                    if let sod = try passport.getDataGroup(DataGroupId.SOD) as? SOD {
                        ret["eContentBase64"] = try sod.getEncapsulatedContent().base64EncodedString()
                        ret["signatureAlgorithm"] = try sod.getSignatureAlgorithm()
                        ret["encapsulatedContentDigestAlgorithm"] = try sod.getEncapsulatedContentDigestAlgorithm()
                        _ = try sod.getMessageDigestFromSignedAttributes()
                        let signedAttributes = try sod.getSignedAttributes()
                        ret["signedAttributes"] = signedAttributes.base64EncodedString()

                        if let serializedSignature = serializeSignature(from: sod) {
                            ret["signatureBase64"] = serializedSignature
                        }
                    } else {
                        print("SOD not found or could not be cast to SOD")
                        reject("E_PASSPORT_READ", "SODNotFound : SOD not found or could not be cast to SOD", nil)
                        return
                    }
                } catch {
                    reject("E_PASSPORT_READ", error.localizedDescription, error)
                    return
                }

                let stringified = String(data: try JSONEncoder().encode(ret), encoding: .utf8)
                onSuccess?()
                resolve(stringified)
            } catch {
                onFailure?(error)
                reject("E_PASSPORT_READ", error.localizedDescription, error)
            }
        }
    }

    static func serializePublicKey(_ publicKey: SecKey) -> String? {
        var error: Unmanaged<CFError>?
        guard let publicKeyData = SecKeyCopyExternalRepresentation(publicKey, &error) as Data? else {
            return nil
        }
        return publicKeyData.base64EncodedString()
    }

    static func serializeSignature(from sod: SOD) -> String? {
        do {
            let signature = try sod.getSignature()
            return signature.base64EncodedString()
        } catch {
            return nil
        }
    }

    static func serializeX509Wrapper(_ certificate: X509Wrapper?) -> String? {
        guard let certificate else {
            return nil
        }

        let itemsDict = certificate.getItemsAsDict()
        var certInfoStringKeys = [String: String]()

        for (key, value) in itemsDict {
            certInfoStringKeys[key.rawValue] = value
        }

        certInfoStringKeys["PEM"] = certificate.certToPEM()

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: certInfoStringKeys, options: [])
            return String(data: jsonData, encoding: .utf8)
        } catch {
            return nil
        }
    }

    static func encodeX509WrapperToJsonString(_ certificate: X509Wrapper?) -> String? {
        guard let certificate else {
            return nil
        }

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: certificate.getItemsAsDict(), options: [])
            return String(data: jsonData, encoding: .utf8)
        } catch {
            return nil
        }
    }

    static func encodeByteArrayToHexString(_ byteArray: [UInt8]) -> String {
        byteArray.map { String(format: "%02x", $0) }.joined()
    }

    static func encodeErrors(_ errors: [Error]) -> [String] {
        errors.map { $0.localizedDescription }
    }

    static func convertDataGroupHashToSerializableFormat(_ dataGroupHash: DataGroupHash) -> [String: Any] {
        [
            "id": dataGroupHash.id,
            "sodHash": dataGroupHash.sodHash,
            "computedHash": dataGroupHash.computedHash,
            "match": dataGroupHash.match,
        ]
    }

    static func dataGroupIdToString(_ id: DataGroupId) -> String {
        String(id.rawValue)
    }

    static func certificateTypeToString(_ type: CertificateType) -> String {
        type.stringValue()
    }

    static func convertDataGroupToSerializableFormat(_ dataGroup: DataGroup) -> [String: Any] {
        [
            "datagroupType": dataGroupIdToString(dataGroup.datagroupType),
            "body": encodeByteArrayToHexString(dataGroup.body),
            "data": encodeByteArrayToHexString(dataGroup.data),
        ]
    }
}
#endif
