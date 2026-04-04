// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation
import UIKit
import WebKit

/// Swift implementation of WebViewProvider using WKWebView.
/// Handles message passing between the WebView and the KMP bridge.
public class WebViewProviderImpl: NSObject {
    static let bundledScheme = "self-sdk"
    static let bundledHost = "app"
    static let diditHost = "verify.didit.me"
    static let debugHost = "127.0.0.1"
    static let debugPort = 5173

    private var webView: WKWebView?
    private var viewController: UIViewController?
    private var onMessageReceived: ((String) -> Void)?
    private var isDebugMode: Bool = false

    /// Weak proxy to avoid retain cycles with WKScriptMessageHandler
    private var messageProxy: WeakScriptMessageProxy?

    public override init() {
        super.init()
    }

    @objc(createWebViewOnMessageReceived:isDebugMode:queryParams:)
    public func createWebView(onMessageReceived: @escaping (String) -> Void, isDebugMode: Bool, queryParams: String? = nil) -> UIView {
        self.isDebugMode = isDebugMode
        // Clean up existing webView and script handlers before creating new one
        if let existingWebView = webView {
            existingWebView.configuration.userContentController.removeScriptMessageHandler(forName: "SelfNativeIOS")
            existingWebView.stopLoading()
            existingWebView.removeFromSuperview()
            self.webView = nil
            self.viewController = nil
        }
        
        self.onMessageReceived = onMessageReceived

        // Create message proxy to avoid retain cycle
        let proxy = WeakScriptMessageProxy()
        proxy.delegate = self
        self.messageProxy = proxy

        // Configure WKWebView
        let config = WKWebViewConfiguration()
        let userContentController = WKUserContentController()
        userContentController.add(proxy, name: "SelfNativeIOS")
        config.userContentController = userContentController
        config.setURLSchemeHandler(
            BundledWebViewSchemeHandler(bundle: .module, resourceRoot: "self-sdk-web"),
            forURLScheme: Self.bundledScheme
        )

        // Allow inline media playback
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let wv = WKWebView(frame: .zero, configuration: config)
        wv.isOpaque = false
        wv.backgroundColor = .clear
        wv.scrollView.isScrollEnabled = true
        wv.scrollView.bounces = false

        if #available(iOS 16.4, *), isDebugMode {
            wv.isInspectable = true
        }

        wv.navigationDelegate = self
        self.webView = wv

        guard let url = Self.initialContentURL(queryParams: queryParams, isDebugMode: isDebugMode) else {
            NSLog("SelfSDK-WebView: Failed to construct bundled URL")
            return wv
        }
        wv.load(URLRequest(url: url))

        return wv
    }

    @objc(evaluateJsJs:)
    public func evaluateJs(js: String) {
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(js) { _, error in
                #if DEBUG
                if let error = error {
                    NSLog("SelfSDK-WebView: JS evaluation error: %@", error.localizedDescription)
                }
                #endif
            }
        }
    }

    @objc public func getViewController() -> UIViewController {
        if let existingVC = viewController {
            return existingVC
        }

        let vc = WebViewHostController(webView: webView)
        self.viewController = vc
        return vc
    }

    @objc public func isBridgeRequestAllowed() -> Bool {
        Self.isTrustedBridgeURL(webView?.url, isDebugMode: isDebugMode)
    }
}

// MARK: - Host VC that embeds the WKWebView with proper Auto Layout

private class WebViewHostController: UIViewController {
    private let embeddedWebView: WKWebView?

    init(webView: WKWebView?) {
        self.embeddedWebView = webView
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) is not supported")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        guard let wv = embeddedWebView else { return }
        wv.translatesAutoresizingMaskIntoConstraints = false
        wv.scrollView.contentInsetAdjustmentBehavior = .never
        view.addSubview(wv)
        NSLayoutConstraint.activate([
            wv.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            wv.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            wv.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            wv.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
    }
}

// MARK: - WKNavigationDelegate

extension WebViewProviderImpl: WKNavigationDelegate {
    public func webView(
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

// MARK: - WKScriptMessageHandler

extension WebViewProviderImpl: WKScriptMessageHandler {
    public func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == "SelfNativeIOS",
              message.frameInfo.isMainFrame,
              Self.isTrustedBridgeFrameInfo(message.frameInfo.securityOrigin, isDebugMode: isDebugMode),
              isBridgeRequestAllowed() else { return }

        if let body = message.body as? String {
            onMessageReceived?(body)
        } else if let dict = message.body as? [String: Any],
                  let jsonData = try? JSONSerialization.data(withJSONObject: dict),
                  let jsonString = String(data: jsonData, encoding: .utf8) {
            onMessageReceived?(jsonString)
        }
    }
}

extension WebViewProviderImpl {
    static func initialContentURL(queryParams: String?, isDebugMode: Bool) -> URL? {
        var components = URLComponents()
        components.scheme = isDebugMode ? "http" : bundledScheme
        components.host = isDebugMode ? debugHost : bundledHost
        components.port = isDebugMode ? debugPort : nil
        components.path = "/tunnel/tour/1"
        if let queryParams, !queryParams.isEmpty {
            components.percentEncodedQuery = queryParams
        }
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

// MARK: - Weak proxy to break WKScriptMessageHandler retain cycle

/// WKUserContentController retains its message handler strongly.
/// This proxy breaks the retain cycle by holding a weak reference.
private class WeakScriptMessageProxy: NSObject, WKScriptMessageHandler {
    weak var delegate: WKScriptMessageHandler?

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        delegate?.userContentController(userContentController, didReceive: message)
    }
}
