// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

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
    private var passportReader: PassportReader?
    #endif

    private var progressCallback: NfcProgressCallback?
    private var completionCallback: NfcCompletionCallback?

    @objc public override init() {
        super.init()
        #if !targetEnvironment(simulator)
        self.passportReader = PassportReader()
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

        // Start NFC session using async API
        Task {
            do {
                let passport = try await passportReader.readPassport(
                    password: mrzKey,
                    tags: [.COM, .DG1, .SOD],
                    customDisplayMessage: { [weak self] (displayMessage) in
                        self?.mapDisplayMessageToProgress(displayMessage)
                        return nil
                    }
                )

                // Convert passport data to JSON
                do {
                    let jsonResult = try self.passportToJson(passport: passport)
                    progress(7, 100, "Scan complete!")
                    completion(true, jsonResult)
                } catch {
                    completion(false, "Failed to parse passport data: \(error.localizedDescription)")
                }
            } catch {
                completion(false, "NFC scan failed: \(error.localizedDescription)")
            }
        }
        #endif
    }

    #if !targetEnvironment(simulator)

    /// Maps NFCPassportReader display messages to progress states
    private func mapDisplayMessageToProgress(_ message: NFCViewDisplayMessage) {
        guard let callback = progressCallback else { return }

        switch message {
        case .requestPresentPassport:
            callback(0, 0, "Hold your phone near the passport")
        case .authenticatingWithPassport(let progress):
            callback(2, 15 + progress / 10, "Authenticating with passport...")
        case .readingDataGroupProgress(let dgId, let progress):
            switch dgId {
            case .DG1:
                let percent = 40 + progress / 4 // 40-65%
                callback(3, percent, "Reading passport data...")
            case .SOD:
                let percent = 65 + progress / 4 // 65-90%
                callback(4, percent, "Reading security data...")
            default:
                let percent = 40 + progress / 2
                callback(3, percent, "Reading data...")
            }
        case .successfulRead:
            callback(6, 90, "Processing passport data...")
        case .error:
            break
        case .activeAuthentication:
            callback(5, 85, "Verifying passport...")
        @unknown default:
            break
        }
    }

    /// Converts passport data to JSON string
    private func passportToJson(passport: NFCPassportModel) throws -> String {
        var result: [String: Any] = [:]

        // Document type
        result["documentType"] = passport.documentType

        // Personal details from NFCPassportModel computed properties
        result["documentNumber"] = passport.documentNumber
        result["dateOfBirth"] = passport.dateOfBirth
        result["dateOfExpiry"] = passport.documentExpiryDate
        result["issuer"] = passport.issuingAuthority
        result["nationality"] = passport.nationality
        result["lastName"] = passport.lastName
        result["firstName"] = passport.firstName
        result["gender"] = passport.gender
        result["personalNumber"] = passport.personalNumber ?? ""

        // Full MRZ
        result["mrzString"] = passport.passportMRZ

        // SOD data (Security Object Document)
        if let sod = passport.getDataGroup(.SOD) {
            // Convert raw data to base64
            result["sod"] = Data(sod.data).base64EncodedString()

            // Document signing certificate (PEM encoded)
            if let docSigningCert = passport.documentSigningCertificate {
                result["documentSigningCertificate"] = docSigningCert.certToPEM()
            }

            // Parse SOD structure if it's a SOD type
            if let sodGroup = sod as? SOD {
                // Hash algorithm
                if let hashAlgo = try? sodGroup.getEncapsulatedContentDigestAlgorithm() {
                    result["hashAlgorithm"] = hashAlgo
                }

                // Signature
                if let signature = try? sodGroup.getSignature() {
                    result["signature"] = signature.base64EncodedString()
                }

                // Signed attributes
                if let signedAttributes = try? sodGroup.getSignedAttributes() {
                    result["signedAttributes"] = signedAttributes.base64EncodedString()
                }
            }

            // Data group hashes from the model
            if !passport.dataGroupHashes.isEmpty {
                var hashesDict: [String: String] = [:]
                for (dgId, dgHash) in passport.dataGroupHashes {
                    hashesDict[dgId.getName()] = dgHash.sodHash
                }
                result["dataGroupHashes"] = hashesDict
            }
        }

        // Verification status
        result["passportCorrectlySigned"] = passport.passportCorrectlySigned
        result["documentSigningCertificateVerified"] = passport.documentSigningCertificateVerified
        result["passportDataNotTampered"] = passport.passportDataNotTampered
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
