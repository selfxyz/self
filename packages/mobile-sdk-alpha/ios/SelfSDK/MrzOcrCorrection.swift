// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import QKMRZParser

struct MrzOcrCorrection {

    static func isValid(_ result: QKMRZResult) -> Bool {
        return result.isDocumentNumberValid && result.isExpiryDateValid && result.isBirthdateValid
    }

    static func singleCorrectDocumentNumber(mrzString: String, docNumber: String, parser: QKMRZParser) -> QKMRZResult? {
        let replacements: [Character: [Character]] = [
            "O": ["0"],
            "D": ["0"],
            "I": ["1"],
            "L": ["1"],
            "S": ["5"],
            "G": ["6"],
        ]
        let lines = mrzString.components(separatedBy: "\n")
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

    static func processBelgiumDocument(mrzString: String, parser: QKMRZParser) -> QKMRZResult? {
        guard let correctedLine = correctBelgiumDocumentNumber(mrzString: mrzString) else {
            return nil
        }

        let lines = mrzString.components(separatedBy: "\n")
        guard lines.count >= 3 else { return nil }

        let paddedLine = correctedLine.padding(toLength: 30, withPad: "<", startingAt: 0)

        var correctedLines = lines
        correctedLines[0] = paddedLine
        let correctedMRZString = correctedLines.joined(separator: "\n")

        guard let belgiumResult = parser.parse(mrzString: correctedMRZString) else {
            return nil
        }

        if isValid(belgiumResult) {
            return belgiumResult
        }

        if !belgiumResult.isDocumentNumberValid {
            if let correctedResult = singleCorrectDocumentNumber(mrzString: correctedMRZString, docNumber: belgiumResult.documentNumber, parser: parser) {
                if isValid(correctedResult) {
                    return correctedResult
                }
            }
        }

        return nil
    }

    // MARK: - Private

    private static func correctBelgiumDocumentNumber(mrzString: String) -> String? {
        let line1RegexPattern = "IDBEL(?<doc9>[A-Z0-9]{9})<(?<doc3>[A-Z0-9<]{3})(?<checkDigit>\\d)"
        guard let line1Regex = try? NSRegularExpression(pattern: line1RegexPattern) else { return nil }
        let line1Matcher = line1Regex.firstMatch(in: mrzString, options: [], range: NSRange(location: 0, length: mrzString.count))

        if let line1Matcher = line1Matcher {
            let doc9Range = line1Matcher.range(withName: "doc9")
            let doc3Range = line1Matcher.range(withName: "doc3")
            let checkDigitRange = line1Matcher.range(withName: "checkDigit")

            let doc9 = (mrzString as NSString).substring(with: doc9Range)
            let doc3 = (mrzString as NSString).substring(with: doc3Range)
            let checkDigit = (mrzString as NSString).substring(with: checkDigitRange)

            let startIndex = doc9.index(doc9.startIndex, offsetBy: 3)
            let cleanDoc9 = String(doc9[startIndex...])
            let fullDocumentNumber = cleanDoc9 + doc3

            return "IDBEL\(fullDocumentNumber)\(checkDigit)"
        }
        return nil
    }
}
