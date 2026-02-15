//
//  NfcPassportHelper.swift
//  Self KMP Test App
//
//  Swift wrapper for NFC passport scanning using NFCPassportReader library
//  Exposes @objc API callable from Kotlin via cinterop
//

import Foundation
import UIKit

#if !targetEnvironment(simulator)
import NFCPassportReader
import CoreNFC
#endif

/// Progress callback for NFC scanning
/// Parameters: stateIndex (0-7 matching NfcScanState enum), percent, message
public typealias NfcProgressCallback = (Int, Int, String) -> Void

/// Completion callback for NFC scanning
/// Parameters: success, jsonResult (or error message if failed)
public typealias NfcCompletionCallback = (Bool, String) -> Void

@objc public class NfcPassportHelper: NSObject {

    #if !targetEnvironment(simulator)
    private var passportReader: NFCPassportReader.PassportReader?
    #endif

    private var progressCallback: NfcProgressCallback?
    private var completionCallback: NfcCompletionCallback?

    @objc public override init() {
        super.init()
        #if !targetEnvironment(simulator)
        self.passportReader = NFCPassportReader.PassportReader()
        #endif
    }

    /// Checks if NFC is available on this device
    @objc public static func isNfcAvailable() -> Bool {
        #if targetEnvironment(simulator)
        return false
        #else
        return NFCReaderSession.readingAvailable
        #endif
    }

    /// Scans an NFC-enabled passport
    /// - Parameters:
    ///   - passportNumber: Passport number (for MRZ key)
    ///   - dateOfBirth: Date of birth in YYMMDD format
    ///   - dateOfExpiry: Date of expiry in YYMMDD format
    ///   - progress: Progress callback
    ///   - completion: Completion callback with JSON result
    @objc public func scanPassport(
        passportNumber: String,
        dateOfBirth: String,
        dateOfExpiry: String,
        progress: @escaping NfcProgressCallback,
        completion: @escaping NfcCompletionCallback
    ) {
        #if targetEnvironment(simulator)
        completion(false, "NFC is not available on simulator")
        return
        #else

        self.progressCallback = progress
        self.completionCallback = completion

        // Compute MRZ key
        let mrzKey = computeMrzKey(
            passportNumber: passportNumber,
            dateOfBirth: dateOfBirth,
            dateOfExpiry: dateOfExpiry
        )

        guard let passportReader = self.passportReader else {
            completion(false, "PassportReader not initialized")
            return
        }

        // Report initial state
        progress(0, 0, "Hold your phone near the passport")

        // Start NFC session
        passportReader.readPassport(
            mrzKey: mrzKey,
            tags: [.COM, .DG1, .SOD],
            customDisplayMessage: { (displayMessage) in
                // Map display messages to progress states
                self.mapDisplayMessageToProgress(displayMessage)
            },
            completed: { (passport, error) in
                if let error = error {
                    completion(false, "NFC scan failed: \(error.localizedDescription)")
                    return
                }

                guard let passport = passport else {
                    completion(false, "NFC scan failed: No passport data")
                    return
                }

                // Convert passport data to JSON
                do {
                    let jsonResult = try self.passportToJson(passport: passport)
                    progress(7, 100, "Scan complete!")
                    completion(true, jsonResult)
                } catch {
                    completion(false, "Failed to parse passport data: \(error.localizedDescription)")
                }
            }
        )
        #endif
    }

    #if !targetEnvironment(simulator)

    /// Maps NFCPassportReader display messages to progress states
    private func mapDisplayMessageToProgress(_ message: NFCViewDisplayMessage) {
        guard let callback = progressCallback else { return }

        switch message {
        case .requestPresentPassport:
            callback(0, 0, "Hold your phone near the passport")
        case .authenticatingWithPassport:
            callback(2, 15, "Authenticating with passport...")
        case .readingDataGroupProgress(let tag, let progress):
            if tag == "DG1" {
                let percent = 40 + Int(progress * 15) // 40-55%
                callback(3, percent, "Reading passport data...")
            } else if tag == "SOD" {
                let percent = 55 + Int(progress * 15) // 55-70%
                callback(4, percent, "Reading security data...")
            }
        case .successfulRead:
            callback(6, 90, "Processing passport data...")
        case .error(let error):
            // Errors handled in completion callback
            break
        @unknown default:
            break
        }
    }

    /// Converts passport data to JSON string
    private func passportToJson(passport: NFCPassportModel) throws -> String {
        var result: [String: Any] = [:]

        // Document type
        result["documentType"] = passport.documentType

        // Personal details from DG1
        if let dg1 = passport.dataGroupsRead[.DG1] as? DataGroup1 {
            let mrz = dg1.mrz

            result["documentNumber"] = mrz.documentNumber
            result["dateOfBirth"] = mrz.dateOfBirth
            result["dateOfExpiry"] = mrz.dateOfExpiry
            result["issuer"] = mrz.countryCode
            result["nationality"] = mrz.nationality
            result["lastName"] = mrz.lastName
            result["firstName"] = mrz.firstName
            result["gender"] = mrz.gender
            result["personalNumber"] = mrz.personalNumber ?? ""

            // Full MRZ
            result["mrzString"] = "\(mrz.mrzLine1)\n\(mrz.mrzLine2)"
        }

        // SOD data (Security Object Document)
        if let sodBytes = passport.dataGroupsRead[.SOD] as? DataGroup,
           let sodData = sodBytes.data {

            // Convert to base64
            result["sod"] = sodData.base64EncodedString()

            // Parse SOD structure
            if let sod = try? SOD(data: sodData) {
                // Document signing certificate
                if let docSigningCert = sod.documentSigningCertificate {
                    let certData = SecCertificateCopyData(docSigningCert) as Data
                    result["documentSigningCertificate"] = certData.base64EncodedString()
                }

                // LDS security object (hashes)
                if let ldsSecurityObject = sod.ldsSecurityObject {
                    result["hashAlgorithm"] = ldsSecurityObject.hashAlgorithm

                    var dataGroupHashes: [String: String] = [:]
                    for (tag, hash) in ldsSecurityObject.dataGroupHashes {
                        dataGroupHashes["\(tag)"] = hash.base64EncodedString()
                    }
                    result["dataGroupHashes"] = dataGroupHashes
                }

                // Signature
                if let signature = sod.signature {
                    result["signature"] = signature.base64EncodedString()
                }

                // Signed attributes
                if let signedAttributes = sod.signedAttributes {
                    result["signedAttributes"] = signedAttributes.base64EncodedString()
                }
            }
        }

        // Passive authentication status
        result["passiveAuthenticationPassed"] = passport.passiveAuthenticationPassed

        // Verification status
        result["isPACESupported"] = passport.isPACESupported
        result["isChipAuthenticationSupported"] = passport.isChipAuthenticationSupported

        // Convert to JSON string
        let jsonData = try JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted, .sortedKeys])
        guard let jsonString = String(data: jsonData, encoding: .utf8) else {
            throw NSError(domain: "NfcPassportHelper", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to convert to JSON string"])
        }

        return jsonString
    }

    #endif

    /// Computes MRZ key from passport details
    private func computeMrzKey(passportNumber: String, dateOfBirth: String, dateOfExpiry: String) -> String {
        // Pad passport number to 9 characters
        let paddedPassportNumber = passportNumber.padding(toLength: 9, withPad: "<", startingAt: 0)

        // Compute check digits
        let passportCheckDigit = computeCheckDigit(paddedPassportNumber)
        let dobCheckDigit = computeCheckDigit(dateOfBirth)
        let expiryCheckDigit = computeCheckDigit(dateOfExpiry)

        // Combine: PassportNumber + CheckDigit + DOB + CheckDigit + Expiry + CheckDigit
        let mrzKey = "\(paddedPassportNumber)\(passportCheckDigit)\(dateOfBirth)\(dobCheckDigit)\(dateOfExpiry)\(expiryCheckDigit)"

        return mrzKey
    }

    /// Computes MRZ check digit using ICAO 9303 algorithm
    private func computeCheckDigit(_ input: String) -> Int {
        let weights = [7, 3, 1]
        var sum = 0

        for (index, char) in input.enumerated() {
            let value: Int
            if char.isNumber {
                value = Int(String(char)) ?? 0
            } else if char.isLetter {
                value = Int(char.asciiValue ?? 0) - Int(Character("A").asciiValue ?? 0) + 10
            } else {
                value = 0 // '<' or other characters
            }

            sum += value * weights[index % 3]
        }

        return sum % 10
    }
}
