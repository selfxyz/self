// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation
import LocalAuthentication

/// Biometric authentication bridge using LAContext (Face ID / Touch ID).
public class BiometricBridge: NativeBridgeHandler {

    public let domain = "biometrics"

    public init() {}

    public func handle(
        method: String,
        params: [String: Any],
        completion: @escaping (Result<Any?, BridgeHandlerError>) -> Void
    ) {
        switch method {
        case "isAvailable":
            checkAvailability(completion: completion)
        case "authenticate":
            authenticate(params: params, completion: completion)
        case "getBiometryType":
            getBiometryType(completion: completion)
        default:
            completion(.failure(BridgeHandlerError(
                code: "UNKNOWN_METHOD",
                message: "Unknown biometrics method: \(method)"
            )))
        }
    }

    private func checkAvailability(
        completion: @escaping (Result<Any?, BridgeHandlerError>) -> Void
    ) {
        let context = LAContext()
        var error: NSError?
        let canEvaluate = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        completion(.success(["available": canEvaluate]))
    }

    private func authenticate(
        params: [String: Any],
        completion: @escaping (Result<Any?, BridgeHandlerError>) -> Void
    ) {
        let reason = params["reason"] as? String ?? "Authenticate with Self"
        let context = LAContext()

        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, error in
            if success {
                completion(.success(["authenticated": true]))
            } else {
                let errorMessage = error?.localizedDescription ?? "Authentication failed"
                completion(.failure(BridgeHandlerError(
                    code: "BIOMETRIC_ERROR",
                    message: errorMessage
                )))
            }
        }
    }

    private func getBiometryType(
        completion: @escaping (Result<Any?, BridgeHandlerError>) -> Void
    ) {
        let context = LAContext()
        var error: NSError?
        _ = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)

        let typeString: String
        switch context.biometryType {
        case .faceID:
            typeString = "faceId"
        case .touchID:
            typeString = "touchId"
        case .opticID:
            typeString = "opticId"
        @unknown default:
            typeString = "none"
        }

        completion(.success(["type": typeString]))
    }
}
