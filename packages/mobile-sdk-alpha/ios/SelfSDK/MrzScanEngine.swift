// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Vision
import UIKit

struct MrzScanEngine {
    static func scan(image: UIImage, roi: CGRect? = nil, completion: @escaping (String, [CGRect]) -> Void) {
        guard let cgImage = image.cgImage else {
            DispatchQueue.main.async {
                completion("Image not valid", [])
            }
            return
        }

        let request = VNRecognizeTextRequest { (request, error) in
            if let error = error {
                print("Vision error: \(error)")
            }

            guard let observations = request.results as? [VNRecognizedTextObservation] else {
                print("No text observations found")
                DispatchQueue.main.async {
                    completion("No text found", [])
                }
                return
            }

            var mrzLines: [String] = []
            var boxes: [CGRect] = []

            let sortedObservations = observations.sorted { $0.boundingBox.minY > $1.boundingBox.minY }

            for (_, obs) in sortedObservations.enumerated() {
                if let candidate = obs.topCandidates(1).first {
                    let text = candidate.string

                    // TD1 format (ID cards): 30 chars, TD3 format (passports): 44 chars
                    if text.matches(pattern: "^[A-Z0-9<]{30}$") ||
                       text.matches(pattern: "^[A-Z0-9<]{44}$") {
                        mrzLines.append(text)
                        boxes.append(obs.boundingBox)

                        if (mrzLines.count == 2 && mrzLines.allSatisfy { $0.count == 44 }) ||
                           (mrzLines.count == 3 && mrzLines.allSatisfy { $0.count == 30 }) {
                            break
                        }
                    }
                }
            }

            DispatchQueue.main.async {
                if mrzLines.isEmpty {
                    print("No MRZ lines found")
                    completion("", [])
                } else {
                    print("Found \(mrzLines.count) MRZ lines")
                    completion(mrzLines.joined(separator: "\n"), boxes)
                }
            }
        }
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = false
        request.recognitionLanguages = ["en"]

        if let roi = roi {
            request.regionOfInterest = roi
        } else {
            let imageHeight = CGFloat(cgImage.height)
            let roiHeight = imageHeight * 0.2
            let defaultRoi = CGRect(x: 0, y: 0, width: 1.0, height: roiHeight / imageHeight)
            request.regionOfInterest = defaultRoi
        }

        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                try handler.perform([request])
            } catch {
                print("Failed to perform recognition: \(error)")
                DispatchQueue.main.async {
                    completion("Failed to perform recognition: \(error)", [])
                }
            }
        }
    }
}

extension String {
    func matches(pattern: String) -> Bool {
        return range(of: pattern, options: .regularExpression) != nil
    }
}
