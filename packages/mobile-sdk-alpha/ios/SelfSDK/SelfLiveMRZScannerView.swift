// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.


// LiveMRZScannerView.swift

import SwiftUI
import QKMRZParser

struct SelfLiveMRZScannerView: View {
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

    var body: some View {
        ZStack(alignment: .bottom) {
                SelfCameraView(
                    frameHandler: { image, roi in
                        if scanComplete { return }
                        SelfMRZScanner.scan(image: image, roi: roi) { result, boxes in
                            recognizedText = result
                            lastMRZDetection = Date()
                            // print("[LiveMRZScannerView] result: \(result)")
                            let parser = QKMRZParser(ocrCorrection: false)
                            if let mrzResult = parser.parse(mrzString: result) {
                                let doc = mrzResult;
                                // print("[LiveMRZScannerView] doc: \(doc)")
                                if doc.allCheckDigitsValid == true && !scanComplete {
                                    parsedMRZ = mrzResult
                                    scanComplete = true
                                    onScanComplete?(mrzResult)
                                    onScanResultAsDict?(mapVisionResultToDictionary(mrzResult))
                                } else if doc.isDocumentNumberValid == false && !scanComplete {
                                    if let correctedResult = singleCorrectDocumentNumberInMRZ(result: result, docNumber: doc.documentNumber, parser: parser) {
                                        let correctedDoc = correctedResult
                                        // print("[LiveMRZScannerView] correctedDoc: \(correctedDoc)")
                                        if correctedDoc.allCheckDigitsValid == true {
                                            parsedMRZ = correctedResult
                                            scanComplete = true
                                            onScanComplete?(correctedResult)
                                            onScanResultAsDict?(mapVisionResultToDictionary(correctedResult))
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
