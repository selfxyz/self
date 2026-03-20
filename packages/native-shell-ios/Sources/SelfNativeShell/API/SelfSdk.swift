// SPDX-License-Identifier: BUSL-1.1

import Foundation
import UIKit

public final class SelfSdk {
    public static func createViewController(
        config: SelfSdkConfig,
        callback: SelfSdkCallback
    ) -> UIViewController {
        let viewController = SelfSdkViewController(config: config, callback: callback)
        viewController.modalPresentationStyle = .fullScreen
        return viewController
    }
}

final class SelfSdkViewController: UIViewController {
    private let config: SelfSdkConfig
    private weak var callback: SelfSdkCallback?
    private var webViewHost: SelfWebViewHost?

    init(config: SelfSdkConfig, callback: SelfSdkCallback) {
        self.config = config
        self.callback = callback
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) is not supported")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        setupWebView()
    }

    private func setupWebView() {
        let lifecycleHandler = LifecycleHandler(
            viewController: self,
            onResult: { [weak self] result in
                if let dict = result as? [String: Any] {
                    self?.callback?.onSuccess(result: dict)
                } else {
                    self?.callback?.onSuccess(result: [:])
                }
            },
            onDismiss: { [weak self] in
                self?.callback?.onCancelled()
            }
        )

        let router = MessageRouter { [weak self] js in
            self?.webViewHost?.evaluateJs(js)
        }
        router.register(handler: SecureStorageHandler())
        router.register(handler: CryptoHandler())
        router.register(handler: lifecycleHandler)

        let host = SelfWebViewHost(router: router, isDebugMode: config.isDebugMode)
        self.webViewHost = host

        let webView = host.createWebView()
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)

        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])

        host.loadContent(queryParams: config.toQueryParams())
    }
}
