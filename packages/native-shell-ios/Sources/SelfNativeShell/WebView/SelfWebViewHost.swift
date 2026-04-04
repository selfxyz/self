// SPDX-License-Identifier: BUSL-1.1

import Foundation
import UIKit
import WebKit

final class SelfWebViewHost: NSObject {
    static let loopbackHost = "127.0.0.1"
    static let diditHost = "verify.didit.me"
    static let debugPort: UInt16 = 5173

    private var webView: WKWebView?
    private let router: MessageRouter
    private let isDebugMode: Bool
    private var assetServer: LocalAssetServer?

    init(router: MessageRouter, isDebugMode: Bool = false) {
        self.router = router
        self.isDebugMode = isDebugMode
        super.init()
    }

    func createWebView() -> WKWebView {
        if !isDebugMode {
            let server = LocalAssetServer(bundle: .module, resourceRoot: "self-sdk-web")
            do {
                try server.start()
            } catch {
                NSLog("SelfWebViewHost: Failed to start local asset server: %@", "\(error)")
            }
            assetServer = server
        }

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

        webView.navigationDelegate = self
        self.webView = webView
        return webView
    }

    func loadContent(queryParams: String) {
        guard let webView = webView else { return }

        guard let url = initialContentURL(queryParams: queryParams) else {
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

    deinit {
        assetServer?.stop()
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
        let isAllowed = isAllowedNavigationURL(url, host: host)
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
              isTrustedBridgeFrameInfo(message.frameInfo.securityOrigin),
              let body = message.body as? String else {
            return
        }
        router.onMessageReceived(rawJson: body, isTrustedSource: isBridgeRequestAllowed())
    }
}

private extension SelfWebViewHost {
    func isBridgeRequestAllowed() -> Bool {
        isTrustedBridgeURL(webView?.url)
    }

    var bundledPort: UInt16 {
        assetServer?.port ?? 0
    }
}

extension SelfWebViewHost {
    func initialContentURL(queryParams: String) -> URL? {
        var components = URLComponents()
        components.scheme = "http"
        components.host = Self.loopbackHost
        components.port = Int(isDebugMode ? Self.debugPort : bundledPort)
        components.path = "/tunnel/tour/1"
        components.percentEncodedQuery = queryParams.isEmpty ? nil : queryParams
        return components.url
    }

    func isAllowedNavigationURL(_ url: URL?, host: String? = nil) -> Bool {
        guard let url else { return false }
        let resolvedHost = host ?? url.host
        return isTrustedBridgeURL(url) ||
            (url.scheme == "https" && resolvedHost == Self.diditHost)
    }

    func isTrustedBridgeURL(_ url: URL?) -> Bool {
        guard let url else { return false }
        let expectedPort = isDebugMode ? Self.debugPort : bundledPort
        return url.scheme == "http" && url.host == Self.loopbackHost && url.port == Int(expectedPort)
    }

    func isTrustedBridgeFrameInfo(_ origin: WKSecurityOrigin) -> Bool {
        let expectedPort = isDebugMode ? Self.debugPort : bundledPort
        return origin.protocol == "http" && origin.host == Self.loopbackHost && origin.port == Int(expectedPort)
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
