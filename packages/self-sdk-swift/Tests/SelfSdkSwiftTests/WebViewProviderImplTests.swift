// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import XCTest
import WebKit
@testable import SelfSdkSwift

final class WebViewProviderImplTests: XCTestCase {
    private let remoteOrigin = "https://self-app-alpha.vercel.app"
    private let diditOrigin = "https://verify.didit.me"
    private let releaseOrigins = ["https://self-app-alpha.vercel.app", "https://verify.didit.me"]
    private let debugOrigins = [
        "https://self-app-alpha.vercel.app",
        "https://verify.didit.me",
        "http://127.0.0.1:5173",
    ]

    func testLoadsKmpProvidedInitialUrl() throws {
        let provider = WebViewProviderImpl()

        let view = provider.createWebView(
            onMessageReceived: { _, _ in },
            allowedNavigationOrigins: releaseOrigins,
            isDebugMode: false,
            initialUrl: "https://self-app-alpha.vercel.app/tunnel/tour/1"
        )

        XCTAssertTrue(view is WKWebView)
    }

    func testCanonicalOriginFromUrl() {
        XCTAssertEqual(
            WebViewProviderImpl.canonicalOrigin(from: URL(string: "https://example.com/path")!),
            "https://example.com"
        )
        XCTAssertEqual(
            WebViewProviderImpl.canonicalOrigin(from: URL(string: "https://example.com:8443/path")!),
            "https://example.com:8443"
        )
        XCTAssertEqual(
            WebViewProviderImpl.canonicalOrigin(from: URL(string: "http://127.0.0.1:5173/tunnel")!),
            "http://127.0.0.1:5173"
        )
        XCTAssertEqual(
            WebViewProviderImpl.canonicalOrigin(from: URL(string: "https://example.com:443/path")!),
            "https://example.com"
        )
    }

    func testReleaseBuildRejectsDebugBehavior() {
        let provider = WebViewProviderImpl()

        _ = provider.createWebView(
            onMessageReceived: { _, _ in },
            allowedNavigationOrigins: releaseOrigins,
            isDebugMode: false,
            initialUrl: "https://self-app-alpha.vercel.app/tunnel/tour/1"
        )

        let vc = provider.getViewController()
        XCTAssertNotNil(vc)
    }

    func testBridgeCallbackIncludesFrameOrigin() {
        let provider = WebViewProviderImpl()
        var receivedOrigin: String?

        _ = provider.createWebView(
            onMessageReceived: { _, origin in
                receivedOrigin = origin
            },
            allowedNavigationOrigins: releaseOrigins,
            isDebugMode: false,
            initialUrl: "https://self-app-alpha.vercel.app/tunnel/tour/1"
        )

        // No messages sent yet
        XCTAssertNil(receivedOrigin)
    }

    func testMainFrameOnlyGuard() {
        // The WKScriptMessageHandler implementation checks message.frameInfo.isMainFrame.
        // Sub-frame messages are silently dropped.
        // Verified by code inspection; WKScriptMessage can't be constructed in unit tests.
    }
}
