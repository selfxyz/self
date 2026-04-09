// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation
import UIKit
import WebKit

/// Swift implementation of WebViewProvider using WKWebView.
/// Handles message passing between the WebView and the KMP bridge.
public class WebViewProviderImpl: NSObject {
    static let loopbackHost = SdkConstants.loopbackHost
    static let diditHost = SdkConstants.diditHost
    static let debugPort = SdkConstants.debugPort
    private static let defaultRemoteBaseURL = URL(string: SdkConstants.defaultRemoteWebAppBaseURL)!

    private var webView: WKWebView?
    private var viewController: UIViewController?
    private var onMessageReceived: ((String) -> Void)?
    private var isDebugMode: Bool = false
    private var remoteWebAppBaseURL: URL = WebViewProviderImpl.defaultRemoteBaseURL
    private var devServerUrl: String?

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

        guard let url = initialContentURL(queryParams: queryParams) else {
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
        isTrustedBridgeURL(webView?.url)
    }

    @objc(configureRemoteLoadingRemoteWebAppBaseURL:)
    public func configureRemoteLoading(remoteWebAppBaseURL: String?) {
        self.remoteWebAppBaseURL = remoteWebAppBaseURL.flatMap { URL(string: $0) }
            ?? Self.defaultRemoteBaseURL
    }

    @objc(configureDevServerDevServerUrl:)
    public func configureDevServer(devServerUrl: String?) {
        self.devServerUrl = devServerUrl
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
        let isAllowed = isAllowedNavigationURL(url, host: host)
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
              isTrustedBridgeFrameInfo(message.frameInfo.securityOrigin),
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
    func initialContentURL(queryParams: String?) -> URL? {
        #if DEBUG
        if isDebugMode, let devUrl = devServerUrl, !devUrl.isEmpty,
           let baseURL = URL(string: devUrl.hasSuffix("/") ? String(devUrl.dropLast()) : devUrl) {
            var components = URLComponents()
            components.scheme = baseURL.scheme
            components.host = baseURL.host
            components.port = baseURL.port
            components.path = SdkConstants.bundledTourPath
            if let queryParams, !queryParams.isEmpty {
                components.percentEncodedQuery = queryParams
            }
            return components.url
        }

        if isDebugMode {
            var components = URLComponents()
            components.scheme = "http"
            components.host = Self.loopbackHost
            components.port = Self.debugPort
            components.path = SdkConstants.bundledTourPath
            if let queryParams, !queryParams.isEmpty {
                components.percentEncodedQuery = queryParams
            }
            return components.url
        }
        #endif

        guard remoteWebAppBaseURL.scheme == "https" else { return nil }
        var components = URLComponents()
        components.scheme = remoteWebAppBaseURL.scheme
        components.host = remoteWebAppBaseURL.host
        if let port = remoteWebAppBaseURL.port { components.port = port }
        components.path = SdkConstants.bundledTourPath
        if let queryParams, !queryParams.isEmpty {
            components.percentEncodedQuery = queryParams
        }
        return components.url
    }

    func isAllowedNavigationURL(_ url: URL?, host: String? = nil) -> Bool {
        guard let url else { return false }
        let resolvedHost = host ?? url.host
        return isTrustedBridgeURL(url) ||
            (url.scheme == "https" && resolvedHost == Self.diditHost && resolvedPort(for: url) == 443)
    }

    func isTrustedBridgeURL(_ url: URL?) -> Bool {
        guard let url else { return false }
        #if DEBUG
        if isDebugMode {
            if let devUrl = devServerUrl, !devUrl.isEmpty, let devBase = URL(string: devUrl) {
                return url.scheme == devBase.scheme && url.host == devBase.host && resolvedPort(for: url) == resolvedPort(for: devBase)
            }
            return url.scheme == "http" && url.host == Self.loopbackHost && url.port == Self.debugPort
        }
        #endif
        return url.scheme == remoteWebAppBaseURL.scheme &&
            url.host == remoteWebAppBaseURL.host &&
            resolvedPort(for: url) == resolvedPort(for: remoteWebAppBaseURL)
    }

    func isTrustedBridgeFrameInfo(_ origin: WKSecurityOrigin) -> Bool {
        #if DEBUG
        if isDebugMode {
            if let devUrl = devServerUrl, !devUrl.isEmpty, let devBase = URL(string: devUrl) {
                let expectedPort = resolvedPort(for: devBase)
                return origin.protocol == devBase.scheme && origin.host == devBase.host && resolvedSecurityOriginPort(origin) == expectedPort
            }
            return origin.protocol == "http" && origin.host == Self.loopbackHost && origin.port == Self.debugPort
        }
        #endif
        let expectedPort = resolvedPort(for: remoteWebAppBaseURL)
        return origin.protocol == remoteWebAppBaseURL.scheme &&
            origin.host == remoteWebAppBaseURL.host &&
            resolvedSecurityOriginPort(origin) == expectedPort
    }

    private func resolvedSecurityOriginPort(_ origin: WKSecurityOrigin) -> Int {
        if origin.port != 0 { return origin.port }
        switch origin.protocol {
        case "https": return 443
        case "http": return 80
        default: return 0
        }
    }

    private func resolvedPort(for url: URL) -> Int {
        if let port = url.port { return port }
        return url.scheme == "https" ? 443 : 80
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
