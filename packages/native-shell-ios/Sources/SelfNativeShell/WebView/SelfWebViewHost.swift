// SPDX-License-Identifier: BUSL-1.1

import Foundation
import UIKit
import WebKit

final class SelfWebViewHost: NSObject {
    static let bundledScheme = "self-sdk"
    static let bundledHost = "app"
    static let diditHost = "verify.didit.me"
    static let debugHost = "127.0.0.1"
    static let debugPort = 5173

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
        config.setURLSchemeHandler(
            BundledWebViewSchemeHandler(bundle: .module, resourceRoot: "self-sdk-web"),
            forURLScheme: Self.bundledScheme
        )
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

        webView.navigationDelegate = self
        self.webView = webView
        return webView
    }

    func loadContent(queryParams: String) {
        guard let webView = webView else { return }

        guard let url = Self.initialContentURL(queryParams: queryParams, isDebugMode: isDebugMode) else {
            NSLog("SelfWebViewHost: Failed to construct bundled URL")
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

extension SelfWebViewHost: WKNavigationDelegate {
    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url, let host = url.host else {
            decisionHandler(.cancel)
            return
        }
        let isAllowed = Self.isAllowedNavigationURL(url, isDebugMode: isDebugMode, host: host)
        decisionHandler(isAllowed ? .allow : .cancel)
    }
}

extension SelfWebViewHost: WKScriptMessageHandler {
    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == "SelfNativeIOS",
              message.frameInfo.isMainFrame,
              Self.isTrustedBridgeFrameInfo(message.frameInfo.securityOrigin, isDebugMode: isDebugMode),
              let body = message.body as? String else {
            return
        }
        router.onMessageReceived(rawJson: body, isTrustedSource: isBridgeRequestAllowed())
    }
}

private extension SelfWebViewHost {
    func isBridgeRequestAllowed() -> Bool {
        Self.isTrustedBridgeURL(webView?.url, isDebugMode: isDebugMode)
    }
}

extension SelfWebViewHost {
    static func initialContentURL(queryParams: String, isDebugMode: Bool) -> URL? {
        var components = URLComponents()
        components.scheme = isDebugMode ? "http" : bundledScheme
        components.host = isDebugMode ? debugHost : bundledHost
        components.port = isDebugMode ? debugPort : nil
        components.path = "/tunnel/tour/1"
        components.percentEncodedQuery = queryParams.isEmpty ? nil : queryParams
        return components.url
    }

    static func isAllowedNavigationURL(_ url: URL?, isDebugMode: Bool, host: String? = nil) -> Bool {
        guard let url else { return false }
        let resolvedHost = host ?? url.host
        return isTrustedBridgeURL(url, isDebugMode: isDebugMode) ||
            (url.scheme == "https" && resolvedHost == diditHost)
    }

    static func isTrustedBridgeURL(_ url: URL?, isDebugMode: Bool) -> Bool {
        guard let url else { return false }
        if isDebugMode {
            return url.scheme == "http" && url.host == debugHost && url.port == debugPort
        }
        return url.scheme == bundledScheme && url.host == bundledHost
    }

    static func isTrustedBridgeFrameInfo(_ origin: WKSecurityOrigin, isDebugMode: Bool) -> Bool {
        if isDebugMode {
            return origin.protocol == "http" && origin.host == debugHost && origin.port == debugPort
        }
        return origin.protocol == bundledScheme && origin.host == bundledHost
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
