// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation
import LocalAuthentication

/// Swift implementation of BiometricProvider using LocalAuthentication framework.
/// Provides Face ID / Touch ID authentication.
public class BiometricProviderImpl: NSObject {

    public override init() {
        super.init()
    }

    @objc public func isAvailable() -> Bool {
        let context = LAContext()
        var error: NSError?
        return context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
    }

    @objc public func getBiometryType() -> String {
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return "none"
        }

        switch context.biometryType {
        case .none:
            return "none"
        case .faceID:
            return "faceId"
        case .touchID:
            return "touchId"
        case .opticID:
            return "opticId"
        @unknown default:
            return "biometric"
        }
    }

    /// Authenticates the user with biometrics.
    /// - Parameters:
    ///   - reason: The reason string displayed to the user
    ///   - onSuccess: Called when authentication succeeds
    ///   - onError: Called with error message when authentication fails
    @objc(authenticateReason:onSuccess:onError:)
    public func authenticate(reason: String, onSuccess: @escaping () -> Void, onError: @escaping (String) -> Void) {
        let context = LAContext()
        context.evaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            localizedReason: reason
        ) { success, error in
            DispatchQueue.main.async {
                if success {
                    onSuccess()
                } else {
                    onError(error?.localizedDescription ?? "Authentication failed")
                }
            }
        }
    }
}
