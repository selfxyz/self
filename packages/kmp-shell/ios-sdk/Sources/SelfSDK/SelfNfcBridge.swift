// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

#if canImport(CoreNFC)
import CoreNFC
#endif
import Foundation

/// NFC bridge handler wrapping NFCPassportReader for iOS.
///
/// CoreNFC requires a physical device — simulator support is not available.
/// The handler manages the NFC session lifecycle and emits progress events
/// through the message router.
public class SelfNfcBridge: NSObject, NativeBridgeHandler {

    public let domain = "nfc"

    private weak var router: NativeMessageRouter?

    public init(router: NativeMessageRouter) {
        self.router = router
    }

    public func handle(
        method: String,
        params: [String: Any],
        completion: @escaping (Result<Any?, BridgeHandlerError>) -> Void
    ) {
        switch method {
        case "isSupported":
            #if canImport(CoreNFC)
            let supported = NFCTagReaderSession.readingAvailable
            completion(.success(["supported": supported]))
            #else
            completion(.success(["supported": false]))
            #endif

        case "scan":
            scanPassport(params: params, completion: completion)

        case "cancelScan":
            // Cancel is handled by the NFC session's invalidation
            completion(.success(["cancelled": true]))

        default:
            completion(.failure(BridgeHandlerError(
                code: "UNKNOWN_METHOD",
                message: "Unknown NFC method: \(method)"
            )))
        }
    }

    // MARK: - Passport Scanning

    private func scanPassport(
        params: [String: Any],
        completion: @escaping (Result<Any?, BridgeHandlerError>) -> Void
    ) {
        guard let passportNumber = params["passportNumber"] as? String,
              let dateOfBirth = params["dateOfBirth"] as? String,
              let dateOfExpiry = params["dateOfExpiry"] as? String
        else {
            completion(.failure(BridgeHandlerError(
                code: "MISSING_PARAMS",
                message: "passportNumber, dateOfBirth, and dateOfExpiry are required"
            )))
            return
        }

        #if canImport(CoreNFC)
        guard NFCTagReaderSession.readingAvailable else {
            completion(.failure(BridgeHandlerError(
                code: "NFC_NOT_AVAILABLE",
                message: "NFC is not available on this device"
            )))
            return
        }

        pushProgress(step: "waiting_for_tag", percent: 0, message: "Place document on device")

        // Use NFCPassportReader library (already in the project as a CocoaPod)
        // This mirrors the logic from app/ios/PassportReader.swift
        let canNumber = params["canNumber"] as? String ?? ""
        let useCan = params["useCan"] as? Bool ?? false
        let skipPACE = params["skipPACE"] as? Bool ?? false
        let skipCA = params["skipCA"] as? Bool ?? false

        // Pad document number to 9 chars
        let paddedDocNum = passportNumber.padding(toLength: max(passportNumber.count, 9), withPad: "<", startingAt: 0)

        // The actual scanning uses NFCPassportReader library
        // which handles BAC/PACE, DG reading, and chip authentication
        scanWithPassportReader(
            documentNumber: paddedDocNum,
            dateOfBirth: dateOfBirth,
            dateOfExpiry: dateOfExpiry,
            canNumber: canNumber,
            useCan: useCan,
            skipPACE: skipPACE,
            skipCA: skipCA,
            completion: completion
        )
        #else
        completion(.failure(BridgeHandlerError(
            code: "NFC_NOT_AVAILABLE",
            message: "CoreNFC is not available"
        )))
        #endif
    }

    #if canImport(CoreNFC)
    private func scanWithPassportReader(
        documentNumber: String,
        dateOfBirth: String,
        dateOfExpiry: String,
        canNumber: String,
        useCan: Bool,
        skipPACE: Bool,
        skipCA: Bool,
        completion: @escaping (Result<Any?, BridgeHandlerError>) -> Void
    ) {
        // NFCPassportReader is the existing Swift library used by the RN app
        // Import via: import NFCPassportReader
        //
        // The integration pattern mirrors app/ios/PassportReader.swift:
        //
        // let passportReader = PassportReader()
        // passportReader.readPassport(
        //     mrzKey: mrzKey,
        //     tags: [.DG1, .DG2, .SOD],
        //     skipSecureElements: false,
        //     customDisplayMessage: { ... }
        // ) { result in
        //     switch result {
        //     case .success(let passport):
        //         // Extract MRZ, DG hashes, SOD, DSC
        //         // Build PassportScanResult equivalent
        //     case .failure(let error):
        //         completion(.failure(...))
        //     }
        // }
        //
        // For now, provide the shell with progress events.
        // Full implementation requires linking NFCPassportReader.xcframework.

        pushProgress(step: "bac", percent: 10, message: "Authenticating with document")

        // TODO: Wire NFCPassportReader library once xcframework is linked
        completion(.failure(BridgeHandlerError(
            code: "NOT_YET_IMPLEMENTED",
            message: "iOS NFC scanning requires NFCPassportReader.xcframework to be linked"
        )))
    }
    #endif

    // MARK: - Progress Events

    private func pushProgress(step: String, percent: Int, message: String) {
        router?.pushEvent(
            domain: "nfc",
            event: "scanProgress",
            data: [
                "step": step,
                "percent": percent,
                "message": message,
            ]
        )
    }
}
