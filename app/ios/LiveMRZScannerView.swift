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

    /// Calculates the MRZ check digit using the ICAO 9303 standard
    private func calculateMRZCheckDigit(_ input: String) -> Int {
        let weights = [7, 3, 1]
        var sum = 0

        for (index, char) in input.enumerated() {
            let value: Int
            if char.isNumber {
                value = Int(String(char)) ?? 0
            } else if char.isLetter {
                // mapping letters to values: A=10, B=11, ..., Z=35
                value = Int(char.asciiValue ?? 0) - Int(Character("A").asciiValue ?? 0) + 10
            } else if char == "<" {
                value = 0
            } else {
                value = 0
            }

            let weight = weights[index % 3]
            sum += value * weight
        }

        return sum % 10
    }

    /// Extracts and validates the Belgian document number from MRZ line 1, handling both standard and overflow formats.
    /// Belgian TD1 format uses an overflow mechanism when document numbers exceed 9 digits.
    /// Example overflow format: IDBEL595392450<8039<<<<<<<<<< where positions 6-14 contain the principal part (595392450),
    /// position 15 contains the overflow indicator (<), positions 16-18 contain overflow digits (803), and position 19 contains the check digit (9).
    /// The full document number becomes: 595392450803.
    private func extractAndValidateBelgianDocumentNumber(line1: String) -> (documentNumber: String, isValid: Bool)? {
        guard line1.count == 30 else { return nil }

        // extracting positions 6-14 (9 characters - principal part)
        let startIndex6 = line1.index(line1.startIndex, offsetBy: 5)
        let endIndex14 = line1.index(line1.startIndex, offsetBy: 14)
        let principalPart = String(line1[startIndex6..<endIndex14])

        // checking position 15 for overflow indicator
        let pos15Index = line1.index(line1.startIndex, offsetBy: 14)
        let pos15 = line1[pos15Index]

        if pos15 != "<" {
            // handling standard format where position 15 is the check digit
            let checkDigit = Int(String(pos15)) ?? -1
            let calculatedCheck = calculateMRZCheckDigit(principalPart)
            let isValid = (checkDigit == calculatedCheck)
            print("[extractAndValidateBelgianDocumentNumber] Standard format: \(principalPart), check=\(checkDigit), calculated=\(calculatedCheck), valid=\(isValid)")
            return (principalPart, isValid)
        }

        // handling overflow format: scanning positions 16+ until we hit <
        let pos16Index = line1.index(line1.startIndex, offsetBy: 15)
        let remainingPart = String(line1[pos16Index...])

        // finding the overflow digits and the check digit
        var overflowDigits = ""
        var checkDigitChar: Character?

        for char in remainingPart {
            if char == "<" {
                break
            }
            overflowDigits.append(char)
        }

        guard overflowDigits.count > 0 else {
            print("[extractAndValidateBelgianDocumentNumber] ERROR: No overflow digits found")
            return nil
        }

        // extracting check digit (last character of overflow)
        checkDigitChar = overflowDigits.last
        let overflowWithoutCheck = String(overflowDigits.dropLast())

        // constructing full document number: principal + overflow (without check digit)
        let fullDocumentNumber = principalPart + overflowWithoutCheck

        // validating check digit against full document number
        let checkDigit = Int(String(checkDigitChar!)) ?? -1
        let calculatedCheck = calculateMRZCheckDigit(fullDocumentNumber)
        let isValid = (checkDigit == calculatedCheck)

        print("[extractAndValidateBelgianDocumentNumber] Overflow format:")
        print("  Principal part (6-14): \(principalPart)")
        print("  Overflow with check: \(overflowDigits)")
        print("  Overflow without check: \(overflowWithoutCheck)")
        print("  Full document number: \(fullDocumentNumber)")
        print("  Check digit: \(checkDigit)")
        print("  Calculated check: \(calculatedCheck)")
        print("  Valid: \(isValid)")

        return (fullDocumentNumber, isValid)
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

    /// Processes Belgian ID documents by manually extracting and validating the document number using the overflow format handler,
    /// then parses the remaining MRZ fields (name, dates, etc.) using QKMRZParser. This bypasses QKMRZParser's validation for the
    /// document number field since it doesn't handle Belgian overflow format correctly.
    private func processBelgiumDocument(result: String, parser: QKMRZParser) -> QKMRZResult? {
        print("[LiveMRZScannerView] Processing Belgium document with manual validation")

        let lines = result.components(separatedBy: "\n")
        guard lines.count >= 3 else {
            print("[LiveMRZScannerView] Invalid MRZ format - not enough lines")
            return nil
        }

        let line1 = lines[0]
        print("[LiveMRZScannerView] Line 1: \(line1)")

        // extracting and validating document number manually using overflow format handler
        guard let (documentNumber, isDocNumberValid) = extractAndValidateBelgianDocumentNumber(line1: line1) else {
            print("[LiveMRZScannerView] Failed to extract Belgian document number")
            return nil
        }

        if !isDocNumberValid {
            print("[LiveMRZScannerView] Belgian document number check digit is INVALID")
            return nil
        }

        print("[LiveMRZScannerView] Belgian document number validated: \(documentNumber) ✓")

        // parsing the original MRZ to get all other fields (name, birthdate, etc.)
        // using QKMRZParser for non-documentNumber fields
        guard let mrzResult = parser.parse(mrzString: result) else {
            print("[LiveMRZScannerView] Failed to parse MRZ with QKMRZParser")
            return nil
        }

        print("[LiveMRZScannerView] QKMRZParser extracted fields:")
        print("  countryCode: \(mrzResult.countryCode)")
        print("  surnames: \(mrzResult.surnames)")
        print("  givenNames: \(mrzResult.givenNames)")
        print("  birthdate: \(mrzResult.birthdate?.description ?? "nil")")
        print("  sex: \(mrzResult.sex ?? "nil")")
        print("  expiryDate: \(mrzResult.expiryDate?.description ?? "nil")")
        print("  personalNumber: \(mrzResult.personalNumber)")
        print("  Parser's documentNumber: \(mrzResult.documentNumber)")
        print("  Our validated documentNumber: \(documentNumber)")

        // returning MRZ result with manually validated document number
        // note: accepting the parser result for other fields (birthdate, expiry) as they should be correct
        return mrzResult
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
