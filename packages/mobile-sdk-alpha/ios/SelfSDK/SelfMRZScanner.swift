// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.


//
//  MRZScanner.swift

import Vision
import UIKit

struct SelfMRZScanner {
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

            // print("Found \(observations.count) text observations")

            var mrzLines: [String] = []
            var boxes: [CGRect] = []

            // Sort lines from top to bottom
            let sortedObservations = observations.sorted { $0.boundingBox.minY > $1.boundingBox.minY }

            for (index, obs) in sortedObservations.enumerated() {
                if let candidate = obs.topCandidates(1).first {
                    let text = candidate.string
                    let confidence = candidate.confidence
                    // print("Line \(index): '\(text)' (confidence: \(confidence), position: \(obs.boundingBox))")

                    // Check if this looks like an MRZ line (either contains "<" or matches MRZ pattern)
                    // TD1 format (ID cards): 30 chars, TD3 format (passports): 44 chars
                    if text.contains("<") ||
                       text.matches(pattern: "^[A-Z0-9<]{30}$") || //TD1 //case where there's no '<' in MRZ
                       text.matches(pattern: "^[A-Z0-9<]{44}$")  //TD3
                       {
                        // print("Matched MRZ pattern: \(text)")
                        mrzLines.append(text)
                        boxes.append(obs.boundingBox)

                        // Check if we have a complete MRZ
                        if (mrzLines.count == 2 && mrzLines.allSatisfy { $0.count == 44 }) || // TD3 - passport
                           (mrzLines.count == 3 && mrzLines.allSatisfy { $0.count == 30 }) {  // TD1 - ID card
                            break
                        }
                    } else {
                        print("Did not match MRZ pattern: \(text)")
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

        // Use provided ROI. If not use as bottom 20%
        if let roi = roi {
            // print("[MRZScanner] Using provided ROI: \(roi) (image size: \(cgImage.width)x\(cgImage.height))")
            request.regionOfInterest = roi
        } else {
            let imageHeight = CGFloat(cgImage.height)
            let roiHeight = imageHeight * 0.2 // Bottom 20%
            let defaultRoi = CGRect(x: 0, y: 0, width: 1.0, height: roiHeight / imageHeight)
            // print("[MRZScanner] Using default ROI: \(defaultRoi) (image size: \(cgImage.width)x\(cgImage.height), roi height: \(roiHeight))")
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
