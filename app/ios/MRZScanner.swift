//
//  MRZScanner.swift

import Vision
import UIKit

struct MRZScanner {
    static func scan(image: UIImage, completion: @escaping (String, [CGRect]) -> Void) {
        guard let cgImage = image.cgImage else {
            completion("Image not valid", [])
            return
        }

        let request = VNRecognizeTextRequest { (request, error) in
            guard let observations = request.results as? [VNRecognizedTextObservation] else {
                completion("No text found", [])
                return
            }

            var mrzLines: [String] = []
            var boxes: [CGRect] = []
            for obs in observations {
                //   if let text = obs.topCandidates(1).first?.string, text.contains("<") {
                    // mrzLines.append(text)
                if let candidate = obs.topCandidates(1).first, candidate.string.contains("<") {
                    mrzLines.append(candidate.string)
                    boxes.append(obs.boundingBox) // Normalized coordinates
                    // Log confidence for each character
//                    for (i, char) in candidate.string.enumerated() {
//                        if let box = try? candidate.boundingBox(for: candidate.string.index(candidate.string.startIndex, offsetBy: i)..<candidate.string.index(candidate.string.startIndex, offsetBy: i+1)) {
//                            print("Char: \(char), Confidence: \(box.confidence)")
//                        }
//                    }
                }
            }

            if mrzLines.isEmpty {
                completion("", [])
            } else {
                completion(mrzLines.joined(separator: "\n"), boxes)
            }
        }
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = false
        request.recognitionLanguages = ["en"]
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        DispatchQueue.global(qos: .userInitiated).async {
            try? handler.perform([request])
        }
    }
}
