//
//  MrzCameraFactoryImpl.swift
//  iosApp
//
//  Swift implementation of MrzCameraViewFactory that bridges to MrzCameraHelper
//

import Foundation
import UIKit
import ComposeApp

/// Swift implementation of the MRZ camera factory
class MrzCameraFactoryImpl: NSObject {

    /// Call this from app init to register the factory
    static func register() {
        let factory = MrzCameraFactoryImpl()
        MrzCameraFactory.shared.instance = factory
        print("✅ MRZ Camera Factory registered")
    }
}

/// Extension implementing the Kotlin interface
extension MrzCameraFactoryImpl: MrzCameraViewFactory {

    func createCameraView(
        onMrzDetected: @escaping (Any) -> Void,
        onProgress: @escaping (Any) -> Void,
        onError: @escaping (String) -> Void
    ) -> UIView {

        // Create the Swift MRZ camera helper
        let helper = MrzCameraHelper()

        // Create camera preview view
        let cameraView = helper.createCameraPreviewView(frame: .zero)

        // Set up callbacks
        helper.scanMrzWithCallbacks(
            progress: { stateIndex in
                // Pass raw index to Kotlin - let Kotlin convert to enum
                DispatchQueue.main.async {
                    onProgress(stateIndex as Any)
                }
            },
            completion: { success, result in
                DispatchQueue.main.async {
                    if success {
                        // Pass JSON string to Kotlin - let Kotlin parse it
                        onMrzDetected(result as Any)
                    } else {
                        onError(result)
                    }
                }
            }
        )

        // Start camera
        helper.startCamera()

        print("ℹ️ INFO [MrzScan] Camera started via Swift factory")

        return cameraView
    }
}
