// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import Foundation
import SwiftUI

public class CameraCoordinator: ObservableObject {
    public weak var cameraController: CameraViewController?

    public func pauseCamera() {
        cameraController?.stopCameraSession()
    }

    public func resumeCamera() {
        cameraController?.startCameraSession()
    }
}
