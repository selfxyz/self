// SPDX-License-Identifier: BUSL-1.1

import Foundation
import UIKit

final class LifecycleHandler: BridgeHandler {
    let domain: BridgeDomain = .lifecycle

    private weak var viewController: UIViewController?
    private let onResult: ((Any?) -> Void)?
    private let onDismiss: (() -> Void)?

    init(viewController: UIViewController?, onResult: ((Any?) -> Void)?, onDismiss: (() -> Void)?) {
        self.viewController = viewController
        self.onResult = onResult
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
            let result = params?["result"]
            await MainActor.run {
                onResult?(result)
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
                self?.onDismiss?()
            }
        } else {
            onDismiss?()
        }
    }
}
