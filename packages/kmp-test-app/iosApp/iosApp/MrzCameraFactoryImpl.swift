// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

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

    /// Retain the camera helper so ARC doesn't deallocate it (and its capture session/delegate)
    private var cameraHelper: MrzCameraHelper?

    /// Call this from app init to register the factory
    static func register() {
        let factory = MrzCameraFactoryImpl()
        MrzCameraFactory.shared.instance = factory
    }
}

/// Extension implementing the Kotlin interface
extension MrzCameraFactoryImpl: MrzCameraViewFactory {

    func createCameraView(
        onMrzDetected: @escaping (Any) -> Void,
        onProgress: @escaping (Any) -> Void,
        onError: @escaping (String) -> Void
    ) -> UIView {

        // Create the Swift MRZ camera helper and retain it
        let helper = MrzCameraHelper()
        self.cameraHelper = helper

        // Create camera preview view
        let cameraView = helper.createCameraPreviewView(frame: .zero)

        // Set up callbacks
        helper.scanMrzWithCallbacks(
            progress: { stateIndex in
                DispatchQueue.main.async {
                    onProgress(stateIndex as Any)
                }
            },
            completion: { success, result in
                DispatchQueue.main.async {
                    if success {
                        onMrzDetected(result as Any)
                    } else {
                        onError(result)
                    }
                }
            }
        )

        // Start camera
        helper.startCamera()

        return cameraView
    }
}
