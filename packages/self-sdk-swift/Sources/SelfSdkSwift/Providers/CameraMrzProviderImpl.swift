// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation
import UIKit

/// Swift implementation of CameraMrzProvider wrapping MrzCameraHelper.
@objcMembers
public class CameraMrzProviderImpl: NSObject {

    /// Retained during scan to prevent ARC deallocation
    private var cameraHelper: MrzCameraHelper?

    public override init() {
        super.init()
    }

    public func isAvailable() -> Bool {
        return true // Camera is available on all iPhones
    }

    public func createCameraView(
        onMrzDetected: @escaping (String) -> Void,
        onProgress: @escaping (Any) -> Void,
        onError: @escaping (String) -> Void
    ) -> UIView {
        // Stop any existing camera session before creating a new one
        cameraHelper?.stopCamera()

        let helper = MrzCameraHelper()
        self.cameraHelper = helper

        let cameraView = helper.createCameraPreviewView(frame: .zero)

        helper.scanMrzWithCallbacks(
            progress: { stateIndex in
                DispatchQueue.main.async {
                    onProgress(stateIndex as Any)
                }
            },
            completion: { success, result in
                DispatchQueue.main.async {
                    if success {
                        onMrzDetected(result)
                    } else {
                        onError(result)
                    }
                }
            }
        )

        helper.startCamera()

        return cameraView
    }

    public func stopCamera() {
        cameraHelper?.stopCamera()
        cameraHelper = nil
    }
}
