// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import SwiftUI
import QKMRZParser

struct SelfLiveMRZScannerView: View {
    @State private var recognizedText: String = ""
    @State private var lastMRZDetection: Date = Date()
    @State private var parsedMRZ: QKMRZResult? = nil
    @State private var scanComplete: Bool = false
    var onScanComplete: ((QKMRZResult) -> Void)? = nil
    var onScanResultAsDict: (([String: Any]) -> Void)? = nil

    private func handleValidMRZResult(_ result: QKMRZResult) {
        parsedMRZ = result
        scanComplete = true
        onScanComplete?(result)
        onScanResultAsDict?(MrzResultMapper.toDictionary(result))
    }

    var body: some View {
        ZStack(alignment: .bottom) {
                SelfCameraView(
                    frameHandler: { image, roi in
                        if scanComplete { return }
                        SelfMRZScanner.scan(image: image, roi: roi) { result, boxes in
                            recognizedText = result
                            lastMRZDetection = Date()
                            let parser = QKMRZParser(ocrCorrection: false)
                            if let mrzResult = parser.parse(mrzString: result) {
                                guard !scanComplete else { return }

                                if mrzResult.allCheckDigitsValid {
                                    handleValidMRZResult(mrzResult)
                                    return
                                }

                                if mrzResult.countryCode == "BEL" {
                                    if let belgiumResult = MrzOcrCorrection.processBelgiumDocument(mrzString: result, parser: parser) {
                                        handleValidMRZResult(belgiumResult)
                                    }
                                    return
                                }

                                if !mrzResult.isDocumentNumberValid {
                                    if let correctedResult = MrzOcrCorrection.singleCorrectDocumentNumber(mrzString: result, docNumber: mrzResult.documentNumber, parser: parser) {
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
