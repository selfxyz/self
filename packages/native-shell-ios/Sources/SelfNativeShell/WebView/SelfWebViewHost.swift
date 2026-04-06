// SPDX-License-Identifier: BUSL-1.1

import CryptoKit
import Foundation
import UIKit
import WebKit

final class SelfWebViewHost: NSObject {
    static let bundledScheme = "self-sdk"
    static let bundledHost = "app"
    fileprivate static let bundledRootFolder = "self-sdk-web"

    private var webView: WKWebView?
    private let router: MessageRouter
    private let isDebugMode: Bool
    private let remoteWebAppBaseURL: URL?
    private let remoteWebAppIntegritySha256: String?

    init(
        router: MessageRouter,
        isDebugMode: Bool = false,
        remoteWebAppBaseURL: URL? = nil,
        remoteWebAppIntegritySha256: String? = nil
    ) {
        self.router = router
        self.isDebugMode = isDebugMode
        self.remoteWebAppBaseURL = remoteWebAppBaseURL
        self.remoteWebAppIntegritySha256 = remoteWebAppIntegritySha256
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
        config.setURLSchemeHandler(SelfBundledAssetSchemeHandler(), forURLScheme: SelfWebViewHost.bundledScheme)

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.scrollView.bounces = false
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.navigationDelegate = self

        if #available(iOS 16.4, *) {
            webView.isInspectable = isDebugMode
        }

        webView.navigationDelegate = self
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

        if remoteWebAppBaseURL != nil {
            loadVerifiedRemoteContent(queryParams: queryParams)
            return
        }

        if let bundledURL = makeBundledEntryURL(queryParams: queryParams) {
            webView.load(URLRequest(url: bundledURL))
        }
    }

    func evaluateJs(_ js: String) {
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    private func makeBundledEntryURL(queryParams: String) -> URL? {
        RemoteNavigationPolicy.makeEntryURL(
            baseURL: URL(string: "\(SelfWebViewHost.bundledScheme)://\(SelfWebViewHost.bundledHost)"),
            queryParams: queryParams
        )
    }

    private func loadVerifiedRemoteContent(queryParams: String) {
        guard let baseURL = remoteWebAppBaseURL,
              baseURL.scheme == "https",
              baseURL.host != nil,
              let remoteURL = RemoteNavigationPolicy.makeEntryURL(baseURL: baseURL, queryParams: queryParams) else {
            return
        }

        guard let expectedSha256 = remoteWebAppIntegritySha256?.trimmingCharacters(in: .whitespacesAndNewlines),
              !expectedSha256.isEmpty else {
            webView?.load(URLRequest(url: remoteURL))
            return
        }

        Task.detached { [weak self] in
            guard let self else { return }
            guard let verifiedHTML = await self.fetchAndVerifyRemoteEntry(
                url: remoteURL, expectedSha256: expectedSha256
            ) else {
                return
            }

            await MainActor.run {
                self.webView?.loadHTMLString(verifiedHTML, baseURL: remoteURL)
            }
        }
    }

    private static let maxRemoteEntryBytes = 5 * 1024 * 1024

    private func fetchAndVerifyRemoteEntry(url: URL, expectedSha256: String) async -> String? {
        do {
            let configuration = URLSessionConfiguration.ephemeral
            configuration.timeoutIntervalForRequest = 5
            configuration.timeoutIntervalForResource = 5
            let session = URLSession(configuration: configuration)
            let (data, response) = try await session.data(from: url)
            guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
                return nil
            }
            guard RemoteContentIntegrity.isAcceptableMimeType(response.mimeType) else {
                return nil
            }
            guard data.count <= SelfWebViewHost.maxRemoteEntryBytes else {
                return nil
            }

            let digest = SHA256.hash(data: data)
            let actualHash = digest.map { String(format: "%02x", $0) }.joined()
            guard actualHash == normalizeSha256(expectedSha256) else {
                return nil
            }
            return String(data: data, encoding: .utf8)
        } catch {
            return nil
        }
    }

    private func normalizeSha256(_ value: String) -> String {
        RemoteContentIntegrity.normalizeSha256(value)
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
              let body = message.body as? String else {
            return
        }
        router.onMessageReceived(rawJson: body)
    }
}

private final class SelfBundledAssetSchemeHandler: NSObject, WKURLSchemeHandler {
    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let requestURL = urlSchemeTask.request.url,
              let rootURL = Bundle.module.resourceURL?.appendingPathComponent(
                SelfWebViewHost.bundledRootFolder,
                isDirectory: true
              ),
              let fileURL = resolveFileURL(for: requestURL, rootURL: rootURL) else {
            urlSchemeTask.didFailWithError(NSError(domain: NSURLErrorDomain, code: NSURLErrorFileDoesNotExist))
            return
        }

        do {
            let data = try Data(contentsOf: fileURL)
            let response = URLResponse(
                url: requestURL,
                mimeType: mimeType(for: fileURL.pathExtension),
                expectedContentLength: data.count,
                textEncodingName: textEncodingName(for: fileURL.pathExtension)
            )
            urlSchemeTask.didReceive(response)
            urlSchemeTask.didReceive(data)
            urlSchemeTask.didFinish()
        } catch {
            urlSchemeTask.didFailWithError(error)
        }
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}

    private func resolveFileURL(for requestURL: URL, rootURL: URL) -> URL? {
        BundledAssetPathResolver.resolveFileURL(for: requestURL, rootURL: rootURL)
    }

    private func mimeType(for pathExtension: String) -> String {
        switch pathExtension.lowercased() {
        case "html":
            return "text/html"
        case "js":
            return "application/javascript"
        case "css":
            return "text/css"
        case "json":
            return "application/json"
        case "svg":
            return "image/svg+xml"
        case "png":
            return "image/png"
        case "jpg", "jpeg":
            return "image/jpeg"
        case "woff2":
            return "font/woff2"
        case "woff":
            return "font/woff"
        case "ttf":
            return "font/ttf"
        case "otf":
            return "font/otf"
        case "wav":
            return "audio/wav"
        default:
            return "application/octet-stream"
        }
    }

    private func textEncodingName(for pathExtension: String) -> String? {
        switch pathExtension.lowercased() {
        case "html", "js", "css", "json", "svg":
            return "utf-8"
        default:
            return nil
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
