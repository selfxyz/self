// SPDX-License-Identifier: BUSL-1.1

import Foundation
import UIKit
import WebKit

final class SelfWebViewHost: NSObject {
    private var webView: WKWebView?
    private let router: MessageRouter
    private let isDebugMode: Bool

    init(router: MessageRouter, isDebugMode: Bool = false) {
        self.router = router
        self.isDebugMode = isDebugMode
        super.init()
    }

    func createWebView() -> WKWebView {
        let config = WKWebViewConfiguration()
        let contentController = WKUserContentController()
        contentController.add(WeakScriptMessageProxy(handler: self), name: "SelfNativeIOS")
        config.userContentController = contentController
        config.preferences.javaScriptCanOpenWindowsAutomatically = false
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.scrollView.bounces = false
        webView.isOpaque = false
        webView.backgroundColor = .clear

        if #available(iOS 16.4, *) {
            webView.isInspectable = isDebugMode
        }

        self.webView = webView
        return webView
    }

    func loadContent(queryParams: String) {
        guard let webView = webView else { return }

        var urlString = "https://self-app-alpha.vercel.app/tunnel/tour/1"
        if !queryParams.isEmpty {
            urlString += "?\(queryParams)"
        }
        guard let url = URL(string: urlString) else {
            NSLog("SelfWebViewHost: Failed to construct URL from: %@", urlString)
            return
        }
        webView.load(URLRequest(url: url))
    }

    func evaluateJs(_ js: String) {
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }
}

extension SelfWebViewHost: WKScriptMessageHandler {
    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == "SelfNativeIOS",
              let body = message.body as? String else {
            return
        }
        router.onMessageReceived(rawJson: body)
    }
}

// Prevents WKWebView retain cycle with WKScriptMessageHandler
private final class WeakScriptMessageProxy: NSObject, WKScriptMessageHandler {
    private weak var handler: WKScriptMessageHandler?

    init(handler: WKScriptMessageHandler) {
        self.handler = handler
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        handler?.userContentController(userContentController, didReceive: message)
    }
}
