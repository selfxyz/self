// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation
import UIKit
import WebKit

/// Swift implementation of WebViewProvider using WKWebView.
/// Handles message passing between the WebView and the KMP bridge.
public class WebViewProviderImpl: NSObject {

    private var webView: WKWebView?
    private var viewController: UIViewController?
    private var onMessageReceived: ((String) -> Void)?

    /// Weak proxy to avoid retain cycles with WKScriptMessageHandler
    private var messageProxy: WeakScriptMessageProxy?

    public override init() {
        super.init()
    }

    public func createWebView(onMessageReceived: @escaping (String) -> Void, isDebugMode: Bool) -> UIView {
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
        wv.backgroundColor = .white
        wv.scrollView.isScrollEnabled = true

        if #available(iOS 16.4, *), isDebugMode {
            wv.isInspectable = true
        }

        self.webView = wv

        // Load the bundled HTML or localhost for debug
        if isDebugMode {
            if let url = URL(string: "http://localhost:3000") {
                wv.load(URLRequest(url: url))
            }
        } else {
            // Load from app bundle
            if let htmlURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "self-sdk-web") {
                wv.loadFileURL(htmlURL, allowingReadAccessTo: htmlURL.deletingLastPathComponent())
            }
        }

        return wv
    }

    public func evaluateJs(js: String) {
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    public func getViewController() -> UIViewController {
        if let existingVC = viewController {
            return existingVC
        }

        let vc = UIViewController()
        if let wv = webView {
            vc.view = wv
        }
        self.viewController = vc
        return vc
    }
}

// MARK: - WKScriptMessageHandler

extension WebViewProviderImpl: WKScriptMessageHandler {
    public func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == "SelfNativeIOS" else { return }

        if let body = message.body as? String {
            onMessageReceived?(body)
        } else if let dict = message.body as? [String: Any],
                  let jsonData = try? JSONSerialization.data(withJSONObject: dict),
                  let jsonString = String(data: jsonData, encoding: .utf8) {
            onMessageReceived?(jsonString)
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
