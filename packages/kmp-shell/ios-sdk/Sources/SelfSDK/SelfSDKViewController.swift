// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import UIKit
import WebKit

/// Main view controller that hosts the WKWebView and bridges native capabilities
/// to the JavaScript runtime via the bridge protocol.
public class SelfSDKViewController: UIViewController {

    // MARK: - Properties

    private var webView: WKWebView!
    private var messageRouter: NativeMessageRouter!
    private var bridgeHandlers: [String: NativeBridgeHandler] = [:]

    /// Enable dev mode to load from Vite dev server instead of bundled assets.
    public var devMode: Bool = false

    /// URL of the Vite dev server (used when devMode is true).
    public var devServerUrl: String = "http://localhost:5173"

    /// Callback when the SDK completes verification.
    public var onResult: ((VerificationResult) -> Void)?

    /// Callback when the user dismisses the SDK.
    public var onDismiss: (() -> Void)?

    // MARK: - Lifecycle

    public override func viewDidLoad() {
        super.viewDidLoad()

        setupMessageRouter()
        setupWebView()
        registerDefaultHandlers()
        loadContent()
    }

    // MARK: - Setup

    private func setupMessageRouter() {
        messageRouter = NativeMessageRouter { [weak self] javascript in
            DispatchQueue.main.async {
                self?.webView.evaluateJavaScript(javascript, completionHandler: nil)
            }
        }
    }

    private func setupWebView() {
        let config = WKWebViewConfiguration()
        let userContentController = WKUserContentController()

        // Register message handler for bridge communication
        userContentController.add(
            ScriptMessageHandler(router: messageRouter),
            name: "selfNative"
        )

        // Inject bridge bootstrap script at document start
        let bootstrapScript = WKUserScript(
            source: Self.bridgeBootstrapJS,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        userContentController.addUserScript(bootstrapScript)

        config.userContentController = userContentController
        config.allowsInlineMediaPlayback = true

        // Security settings
        config.preferences.javaScriptCanOpenWindowsAutomatically = false

        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.scrollView.bounces = false
        webView.isOpaque = false
        webView.backgroundColor = .white

        // Allow inspection in debug builds
        #if DEBUG
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }
        #endif

        view.addSubview(webView)
    }

    private func registerDefaultHandlers() {
        // Register lifecycle handler
        registerHandler(LifecycleBridgeHandler(viewController: self))
    }

    private func loadContent() {
        if devMode {
            guard let url = URL(string: devServerUrl) else { return }
            webView.load(URLRequest(url: url))
        } else {
            // Load bundled web assets
            if let assetUrl = Bundle.main.url(
                forResource: "index",
                withExtension: "html",
                subdirectory: "self-wallet"
            ) {
                webView.loadFileURL(assetUrl, allowingReadAccessTo: assetUrl.deletingLastPathComponent())
            }
        }
    }

    // MARK: - Public API

    /// Register a native bridge handler for a specific domain.
    public func registerHandler(_ handler: NativeBridgeHandler) {
        bridgeHandlers[handler.domain] = handler
        messageRouter.register(handler)
    }

    /// Push an event to the WebView.
    public func pushEvent(domain: String, event: String, data: [String: Any]) {
        messageRouter.pushEvent(domain: domain, event: event, data: data)
    }

    // MARK: - Bridge Bootstrap JS

    private static let bridgeBootstrapJS = """
    (function() {
        if (window.SelfNativeBridge) return;
        window.SelfNativeBridge = {
            _handleResponse: function(json) {},
            _handleEvent: function(json) {}
        };
        console.log('[SelfBridge] iOS native bridge initialized');
    })();
    """
}

// MARK: - Script Message Handler

/// WKScriptMessageHandler wrapper to avoid retain cycles.
private class ScriptMessageHandler: NSObject, WKScriptMessageHandler {
    private let router: NativeMessageRouter

    init(router: NativeMessageRouter) {
        self.router = router
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let body = message.body as? String else { return }
        router.onMessageReceived(body)
    }
}

// MARK: - Verification Result

/// Result returned to the host app when verification completes.
public struct VerificationResult {
    public let success: Bool
    public let userId: String?
    public let verificationId: String?
    public let proof: Any?
    public let claims: [String: Any]?
    public let error: BridgeErrorInfo?

    public init(
        success: Bool,
        userId: String? = nil,
        verificationId: String? = nil,
        proof: Any? = nil,
        claims: [String: Any]? = nil,
        error: BridgeErrorInfo? = nil
    ) {
        self.success = success
        self.userId = userId
        self.verificationId = verificationId
        self.proof = proof
        self.claims = claims
        self.error = error
    }
}

/// Structured bridge error info.
public struct BridgeErrorInfo {
    public let code: String
    public let message: String

    public init(code: String, message: String) {
        self.code = code
        self.message = message
    }
}
