// SPDX-License-Identifier: BUSL-1.1

import Foundation
import UIKit

final class LifecycleHandler: BridgeHandler {
    let domain: BridgeDomain = .lifecycle

    private weak var viewController: UIViewController?
    private let onResult: ((Any?) -> Void)?
    private let onFailure: ((Error) -> Void)?
    private let onDismiss: (() -> Void)?
    private var hasEmittedResult = false

    init(
        viewController: UIViewController?,
        onResult: ((Any?) -> Void)?,
        onFailure: ((Error) -> Void)?,
        onDismiss: (() -> Void)?
    ) {
        self.viewController = viewController
        self.onResult = onResult
        self.onFailure = onFailure
        self.onDismiss = onDismiss
    }

    func setViewController(_ vc: UIViewController) {
        self.viewController = vc
    }

    func handle(method: String, params: [String: Any]?) async throws -> Any? {
        switch method {
        case "ready":
            return nil

        case "dismiss":
            await MainActor.run { dismiss() }
            return nil

        case "setResult":
            let result = SelfLifecycleResultEnvelope.extractPayload(from: params)
            let isSuccess = SelfLifecycleResultEnvelope.extractSuccess(from: result) ?? false
            await MainActor.run {
                guard !hasEmittedResult else { return }
                hasEmittedResult = true
                if isSuccess {
                    onResult?(result)
                } else {
                    onFailure?(SelfLifecycleResultError(payload: result))
                }
                dismiss()
            }
            return nil

        default:
            throw BridgeHandlerError.unknownMethod(method)
        }
    }

    @MainActor
    private func dismiss() {
        if let vc = viewController {
            vc.dismiss(animated: true) { [weak self] in
                guard let self = self, !self.hasEmittedResult else { return }
                self.hasEmittedResult = true
                self.onDismiss?()
            }
        } else {
            guard !hasEmittedResult else { return }
            hasEmittedResult = true
            onDismiss?()
        }
    }
}

enum SelfLifecycleResultEnvelope {
    static func extractPayload(from params: [String: Any]?) -> Any? {
        guard let params else { return nil }
        if let nestedResult = params["result"] {
            return nestedResult
        }
        return params
    }

    static func extractSuccess(from payload: Any?) -> Bool? {
        guard let payload = payload as? [String: Any] else { return nil }
        return payload["success"] as? Bool
    }
}

struct SelfLifecycleResultError: LocalizedError {
    let payload: Any?

    var errorDescription: String? {
        if let payload = payload as? [String: Any],
           let error = payload["error"] as? [String: Any],
           let message = error["message"] as? String {
            return message
        }

        return "Verification failed"
    }
}
