// SPDX-License-Identifier: BUSL-1.1

import Foundation
import UIKit
import WebKit

final class SelfWebViewHost: NSObject {
    private static let defaultRemoteBaseURL = URL(string: "https://verify.self.xyz/v1/")!

    private var webView: WKWebView?
    private let router: MessageRouter
    private let isDebugMode: Bool
    private let remoteWebAppBaseURL: URL

    init(
        router: MessageRouter,
        isDebugMode: Bool = false,
        remoteWebAppBaseURL: URL? = nil
    ) {
        self.router = router
        self.isDebugMode = isDebugMode
        self.remoteWebAppBaseURL = remoteWebAppBaseURL ?? Self.defaultRemoteBaseURL
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
        webView.navigationDelegate = self

        if #available(iOS 16.4, *) {
            webView.isInspectable = isDebugMode
        }

        self.webView = webView
        return webView
    }

    func loadContent(queryParams: String) {
        guard let webView = webView else { return }
        if isDebugMode {
            let debugBase = URL(string: "http://localhost:5173")
            if let url = RemoteNavigationPolicy.makeEntryURL(baseURL: debugBase, queryParams: queryParams) {
                webView.load(URLRequest(url: url))
            }
            return
        }
        guard remoteWebAppBaseURL.scheme == "https" else { return }
        if let url = RemoteNavigationPolicy.makeEntryURL(baseURL: remoteWebAppBaseURL, queryParams: queryParams) {
            webView.load(URLRequest(url: url))
        }
    }

    func evaluateJs(_ js: String) {
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    private func isAllowedNavigation(url: URL) -> Bool {
        RemoteNavigationPolicy.isAllowedMainFrameNavigation(
            url: url,
            remoteWebAppBaseURL: remoteWebAppBaseURL,
            isDebugMode: isDebugMode
        )
    }

    private func resolvedPort(for url: URL) -> Int {
        RemoteNavigationPolicy.resolvedPort(for: url)
    }

    private func isAllowedSubframeNavigation(url: URL) -> Bool {
        RemoteNavigationPolicy.isAllowedSubframeNavigation(
            url: url,
            remoteWebAppBaseURL: remoteWebAppBaseURL,
            isDebugMode: isDebugMode
        )
    }
}

extension SelfWebViewHost: WKNavigationDelegate {
    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }

        if let targetFrame = navigationAction.targetFrame, !targetFrame.isMainFrame {
            decisionHandler(isAllowedSubframeNavigation(url: url) ? .allow : .cancel)
            return
        }

        decisionHandler(isAllowedNavigation(url: url) ? .allow : .cancel)
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
        router.onMessageReceived(rawJson: body, isTrustedSource: true)
    }
}

private extension SelfWebViewHost {
    func isTrustedBridgeOrigin(_ url: URL?) -> Bool {
        guard let url else { return false }
        if isDebugMode {
            return url.scheme == "http" &&
                url.host == "localhost" &&
                resolvedPort(for: url) == 5173
        }
        return url.scheme == remoteWebAppBaseURL.scheme &&
            url.host == remoteWebAppBaseURL.host &&
            resolvedPort(for: url) == resolvedPort(for: remoteWebAppBaseURL)
    }
}

extension SelfWebViewHost {
    func initialContentURL(queryParams: String) -> URL? {
        if isDebugMode {
            let debugBase = URL(string: "http://localhost:5173")
            return RemoteNavigationPolicy.makeEntryURL(baseURL: debugBase, queryParams: queryParams)
        }
        guard remoteWebAppBaseURL.scheme == "https" else { return nil }
        return RemoteNavigationPolicy.makeEntryURL(baseURL: remoteWebAppBaseURL, queryParams: queryParams)
    }

    func isAllowedNavigationURL(_ url: URL?, host: String? = nil) -> Bool {
        guard let url else { return false }
        return isAllowedNavigation(url: url) || isAllowedSubframeNavigation(url: url)
    }

    func isTrustedBridgeURL(_ url: URL?) -> Bool {
        isTrustedBridgeOrigin(url)
    }

    func isTrustedBridgeFrameInfo(_ origin: WKSecurityOrigin) -> Bool {
        if isDebugMode {
            return origin.protocol == "http" && origin.host == "localhost" && origin.port == 5173
        }
        return origin.protocol == remoteWebAppBaseURL.scheme &&
            origin.host == remoteWebAppBaseURL.host &&
            resolvedSecurityOriginPort(origin) == resolvedPort(for: remoteWebAppBaseURL)
    }

    private func resolvedSecurityOriginPort(_ origin: WKSecurityOrigin) -> Int {
        if origin.port != 0 { return origin.port }
        switch origin.protocol {
        case "https": return 443
        case "http": return 80
        default: return 0
        }
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
