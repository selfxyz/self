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
            "0": ["O"], "O": ["0"],
            "1": ["I"], "I": ["1"],
            "2": ["Z"], "Z": ["2"],
            "8": ["B"], "B": ["8"]
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
                        print("Trying candidate: \(candidate), correctedMRZ: \(correctedMRZ)")
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
                CameraView { image in
                    // print("[LiveMRZScannerView] CameraView frame received. Size: \(image.size), Orientation: \(image.imageOrientation.rawValue)")
                    if scanComplete { return }
                    MRZScanner.scan(image: image) { result, boxes in
                        recognizedText = result
                        lastMRZDetection = Date()
                        let parser = QKMRZParser(ocrCorrection: false)
                        if let mrzResult = parser.parse(mrzString: result) {
                            let doc = mrzResult;
                            if doc.allCheckDigitsValid == true && !scanComplete {
                                parsedMRZ = mrzResult
                                scanComplete = true
                                onScanComplete?(mrzResult)
                                onScanResultAsDict?(mapVisionResultToDictionary(mrzResult))
                            } else if doc.isDocumentNumberValid == false && !scanComplete {
                                if let correctedResult = singleCorrectDocumentNumberInMRZ(result: result, docNumber: doc.documentNumber, parser: parser) {
                                    let correctedDoc = correctedResult
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
                }

            VStack {
                if !scanComplete {
                    Text("Position the camera 30-40cm away from the passport for best results")
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
