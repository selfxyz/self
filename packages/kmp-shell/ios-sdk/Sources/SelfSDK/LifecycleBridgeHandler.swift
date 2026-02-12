// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation

/// Lifecycle bridge handler for managing WebView lifecycle events.
class LifecycleBridgeHandler: NativeBridgeHandler {

    let domain = "lifecycle"

    private weak var viewController: SelfSDKViewController?

    init(viewController: SelfSDKViewController) {
        self.viewController = viewController
    }

    func handle(
        method: String,
        params: [String: Any],
        completion: @escaping (Result<Any?, BridgeHandlerError>) -> Void
    ) {
        switch method {
        case "ready":
            // WebView app has finished loading
            completion(.success(["acknowledged": true]))

        case "dismiss":
            DispatchQueue.main.async { [weak self] in
                self?.viewController?.onDismiss?()
                self?.viewController?.dismiss(animated: true)
            }
            completion(.success(["acknowledged": true]))

        case "setResult":
            let result = VerificationResult(
                success: params["success"] as? Bool ?? false,
                userId: params["userId"] as? String,
                verificationId: params["verificationId"] as? String,
                proof: params["proof"],
                claims: params["claims"] as? [String: Any]
            )

            DispatchQueue.main.async { [weak self] in
                self?.viewController?.onResult?(result)
            }
            completion(.success(["acknowledged": true]))

        default:
            completion(.failure(BridgeHandlerError(
                code: "UNKNOWN_METHOD",
                message: "Unknown lifecycle method: \(method)"
            )))
        }
    }
}
