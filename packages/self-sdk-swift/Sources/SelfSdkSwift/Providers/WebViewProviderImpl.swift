// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation
import UIKit
import WebKit

/// Swift implementation of WebViewProvider using WKWebView.
/// URL policy (trust, navigation allowlists) is owned by the KMP layer.
/// KMP passes allowed origins; this class enforces them in the navigation delegate.
public class WebViewProviderImpl: NSObject {
    private var webView: WKWebView?
    private var viewController: UIViewController?
    private var onMessageReceived: ((String, String?) -> Void)?
    private var allowedNavigationOrigins: [String] = []
    private var isDebugMode: Bool = false

    /// Weak proxy to avoid retain cycles with WKScriptMessageHandler
    private var messageProxy: WeakScriptMessageProxy?

    public override init() {
        super.init()
    }

    @objc(createWebViewOnMessageReceived:allowedNavigationOrigins:isDebugMode:initialUrl:)
    public func createWebView(
        onMessageReceived: @escaping (String, String?) -> Void,
        allowedNavigationOrigins: [String],
        isDebugMode: Bool,
        initialUrl: String
    ) -> UIView {
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
        self.allowedNavigationOrigins = allowedNavigationOrigins

        // Create message proxy to avoid retain cycle
        let proxy = WeakScriptMessageProxy()
        proxy.delegate = self
        self.messageProxy = proxy

        // Configure WKWebView
        let config = WKWebViewConfiguration()
        let userContentController = WKUserContentController()
        userContentController.add(proxy, name: "SelfNativeIOS")
        config.userContentController = userContentController

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

        guard let url = URL(string: initialUrl) else {
            NSLog("SelfSDK-WebView: Failed to parse initialUrl")
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

    /// Check if a URL's origin matches any of the KMP-provided allowed origins.
    private func isNavigationAllowed(_ url: URL) -> Bool {
        let origin = Self.canonicalOrigin(from: url)
        guard let origin else { return false }
        return allowedNavigationOrigins.contains(origin)
    }

    /// Extract the canonical origin (scheme://host or scheme://host:port) from a URL.
    static func canonicalOrigin(from url: URL) -> String? {
        guard let scheme = url.scheme, let host = url.host, !scheme.isEmpty, !host.isEmpty else {
            return nil
        }
        let port = url.port ?? (scheme == "https" ? 443 : 80)
        let defaultPort = scheme == "https" ? 443 : (scheme == "http" ? 80 : -1)
        if port != defaultPort {
            return "\(scheme)://\(host):\(port)"
        } else {
            return "\(scheme)://\(host)"
        }
    }

    /// Serialize a WKSecurityOrigin to the canonical format expected by KMP UrlPolicy:
    /// - `scheme://host` when port is default (443 for HTTPS, 80 for HTTP)
    /// - `scheme://host:port` when port is non-default
    /// - `nil` when scheme or host is unavailable
    /// WKSecurityOrigin.port returns 0 for default ports.
    static func canonicalOrigin(from origin: WKSecurityOrigin) -> String? {
        let scheme = origin.protocol
        let host = origin.host
        guard !scheme.isEmpty, !host.isEmpty else { return nil }

        let port = origin.port
        let resolvedPort: Int
        if port != 0 {
            resolvedPort = port
        } else {
            switch scheme {
            case "https": resolvedPort = 443
            case "http": resolvedPort = 80
            default: resolvedPort = 0
            }
        }

        let defaultPort: Int
        switch scheme {
        case "https": defaultPort = 443
        case "http": defaultPort = 80
        default: defaultPort = -1
        }

        if resolvedPort != defaultPort && resolvedPort > 0 {
            return "\(scheme)://\(host):\(resolvedPort)"
        } else {
            return "\(scheme)://\(host)"
        }
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
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }
        decisionHandler(isNavigationAllowed(url) ? .allow : .cancel)
    }
}

// MARK: - WKScriptMessageHandler

extension WebViewProviderImpl: WKScriptMessageHandler {
    public func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == "SelfNativeIOS",
              message.frameInfo.isMainFrame else { return }

        let frameOrigin = WebViewProviderImpl.canonicalOrigin(from: message.frameInfo.securityOrigin)

        if let body = message.body as? String {
            onMessageReceived?(body, frameOrigin)
        } else if let dict = message.body as? [String: Any],
                  let jsonData = try? JSONSerialization.data(withJSONObject: dict),
                  let jsonString = String(data: jsonData, encoding: .utf8) {
            onMessageReceived?(jsonString, frameOrigin)
        }
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
