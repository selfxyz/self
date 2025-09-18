// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

// LiveMRZScannerView.swift

import SwiftUI
import QKMRZParser

struct LiveMRZScannerView: View {
    @State private var recognizedText: String = ""
    @State private var lastMRZDetection: Date = Date()
    @State private var parsedMRZ: QKMRZResult? = nil
    @State private var scanComplete: Bool = false
    var onScanComplete: ((QKMRZResult) -> Void)? = nil
    var onScanResultAsDict: (([String: Any]) -> Void)? = nil

    func singleCorrectDocumentNumberInMRZ(result: String, docNumber: String, parser: QKMRZParser) -> QKMRZResult? {
        let replacements: [Character: [Character]] = [
            // "0": ["O", "D"],
            // "1": ["I"],
            "O": ["0"],
            "D": ["0"],
            "I": ["1"],
            "L": ["1"],
            "S": ["5"],
            "G": ["6"],
            // "2": ["Z"], "Z": ["2"],
            // "8": ["B"], "B": ["8"]
        ]
        let lines = result.components(separatedBy: "\n")
        guard lines.count >= 2 else { return nil }
        for (i, char) in docNumber.enumerated() {
            if let subs = replacements[char] {
                for sub in subs {
                    var chars = Array(docNumber)
                    chars[i] = sub
                    let candidate = String(chars)
                    if let range = lines[1].range(of: docNumber) {
                        var newLine = lines[1]
                        let start = newLine.distance(from: newLine.startIndex, to: range.lowerBound)
                        var lineChars = Array(newLine)
                        let docNumChars = Array(candidate)
                        for j in 0..<min(docNumber.count, docNumChars.count) {
                            lineChars[start + j] = docNumChars[j]
                        }
                        newLine = String(lineChars)
                        var newLines = lines
                        newLines[1] = newLine
                        let correctedMRZ = newLines.joined(separator: "\n")
                        // print("Trying candidate: \(candidate), correctedMRZ: \(correctedMRZ)")
                        if let correctedResult = parser.parse(mrzString: correctedMRZ) {
                          if correctedResult.isDocumentNumberValid {
                            return correctedResult
                          }
                        }
                    }
                }
            }
        }
        return nil
    }

    private func mapVisionResultToDictionary(_ result: QKMRZResult) -> [String: Any] {
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

    private func correctBelgiumDocumentNumber(result: String) -> String? {
        // Belgium TD1 format: IDBEL000001115<7027
        let line1RegexPattern = "IDBEL(?<doc9>[A-Z0-9]{9})<(?<doc3>[A-Z0-9<]{3})(?<checkDigit>\\d)"
        guard let line1Regex = try? NSRegularExpression(pattern: line1RegexPattern) else { return nil }
        let line1Matcher = line1Regex.firstMatch(in: result, options: [], range: NSRange(location: 0, length: result.count))

        if let line1Matcher = line1Matcher {
            let doc9Range = line1Matcher.range(withName: "doc9")
            let doc3Range = line1Matcher.range(withName: "doc3")
            let checkDigitRange = line1Matcher.range(withName: "checkDigit")

            let doc9 = (result as NSString).substring(with: doc9Range)
            let doc3 = (result as NSString).substring(with: doc3Range)
            let checkDigit = (result as NSString).substring(with: checkDigitRange)

            if let cleanedDoc = cleanBelgiumDocumentNumber(doc9: doc9, doc3: doc3, checkDigit: checkDigit) {
                let correctedMRZLine = "IDBEL\(cleanedDoc)\(checkDigit)"
                return correctedMRZLine
            }
        }
        return nil
    }

    private func cleanBelgiumDocumentNumber(doc9: String, doc3: String, checkDigit: String) -> String? {
        // For Belgium TD1 format: IDBEL000001115<7027
        // doc9 = "000001115" (9 digits)
        // doc3 = "702" (3 digits after <)
        // checkDigit = "7" (single check digit)

        var cleanDoc9 = doc9
        // Strip first 3 characters
        let startIndex = cleanDoc9.index(cleanDoc9.startIndex, offsetBy: 3)
        cleanDoc9 = String(cleanDoc9[startIndex...])

        let fullDocumentNumber = cleanDoc9 + doc3


        return fullDocumentNumber
    }

    private func isValidMRZResult(_ result: QKMRZResult) -> Bool {
        return result.isDocumentNumberValid && result.isExpiryDateValid && result.isBirthdateValid
    }

    private func handleValidMRZResult(_ result: QKMRZResult) {
        parsedMRZ = result
        scanComplete = true
        onScanComplete?(result)
        onScanResultAsDict?(mapVisionResultToDictionary(result))
    }

    private func processBelgiumDocument(result: String, parser: QKMRZParser) -> QKMRZResult? {
        print("[LiveMRZScannerView] Processing Belgium document")

        guard let correctedBelgiumLine = correctBelgiumDocumentNumber(result: result) else {
            print("[LiveMRZScannerView] Failed to correct Belgium document number")
            return nil
        }

        // print("[LiveMRZScannerView] Belgium corrected line: \(correctedBelgiumLine)")

        // Split MRZ into lines and replace the first line
        let lines = result.components(separatedBy: "\n")
        guard lines.count >= 3 else {
            print("[LiveMRZScannerView] Invalid MRZ format - not enough lines")
            return nil
        }

        let originalFirstLine = lines[0]
        // print("[LiveMRZScannerView] Original first line: \(originalFirstLine)")

        // Pad the corrected line to 30 characters (TD1 format)
        let paddedCorrectedLine = correctedBelgiumLine.padding(toLength: 30, withPad: "<", startingAt: 0)
        // print("[LiveMRZScannerView] Padded corrected line: \(paddedCorrectedLine)")

        // Reconstruct the MRZ with the corrected first line
        var correctedLines = lines
        correctedLines[0] = paddedCorrectedLine
        let correctedMRZString = correctedLines.joined(separator: "\n")
        // print("[LiveMRZScannerView] Corrected MRZ string: \(correctedMRZString)")

        guard let belgiumMRZResult = parser.parse(mrzString: correctedMRZString) else {
            print("[LiveMRZScannerView] Belgium MRZ result is not valid")
            return nil
        }

        // print("[LiveMRZScannerView] Belgium MRZ result: \(belgiumMRZResult)")

        // Try the corrected MRZ first
        if isValidMRZResult(belgiumMRZResult) {
            return belgiumMRZResult
        }

        // If document number is still invalid, try single character correction
        if !belgiumMRZResult.isDocumentNumberValid {
            if let correctedResult = singleCorrectDocumentNumberInMRZ(result: correctedMRZString, docNumber: belgiumMRZResult.documentNumber, parser: parser) {
                // print("[LiveMRZScannerView] Single correction successful: \(correctedResult)")
                if isValidMRZResult(correctedResult) {
                    return correctedResult
                }
            }
        }

        return nil
    }

    var body: some View {
        ZStack(alignment: .bottom) {
                CameraView(
                    frameHandler: { image, roi in
                        if scanComplete { return }
                        MRZScanner.scan(image: image, roi: roi) { result, boxes in
                            recognizedText = result
                            lastMRZDetection = Date()
                            // print("[LiveMRZScannerView] result: \(result)")
                            let parser = QKMRZParser(ocrCorrection: false)
                            if let mrzResult = parser.parse(mrzString: result) {
                                let doc = mrzResult
                                // print("[LiveMRZScannerView] doc: \(doc)")

                                guard !scanComplete else { return }

                                // Check if already valid
                                if doc.allCheckDigitsValid {
                                    handleValidMRZResult(mrzResult)
                                    return
                                }

                                // Handle Belgium documents (only if not already valid)
                                if doc.countryCode == "BEL" {
                                    if let belgiumResult = processBelgiumDocument(result: result, parser: parser) {
                                        handleValidMRZResult(belgiumResult)
                                    }
                                    return
                                }

                                // Handle other documents with invalid document numbers
                                if !doc.isDocumentNumberValid {
                                    if let correctedResult = singleCorrectDocumentNumberInMRZ(result: result, docNumber: doc.documentNumber, parser: parser) {
                                        // print("[LiveMRZScannerView] correctedDoc: \(correctedResult)")
                                        if correctedResult.allCheckDigitsValid {
                                            handleValidMRZResult(correctedResult)
                                        }
                                    }
                                }
                            } else {
                                if !scanComplete {
                                    parsedMRZ = nil
                                }
                            }
                        }
                    },
                    showOverlay: false
                )

            VStack {
                if !scanComplete {
                    Text("Align the animation with the MRZ on the passport.")
                        .font(.footnote)
                        .padding()
                        .background(Color.black.opacity(0.7))
                        .foregroundColor(.white)
                        .cornerRadius(8)
                        .padding(.bottom, 40)
                }
            }
        }
    }
}
