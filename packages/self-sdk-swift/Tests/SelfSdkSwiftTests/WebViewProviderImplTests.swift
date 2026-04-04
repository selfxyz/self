// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import XCTest
@testable import SelfSdkSwift

final class WebViewProviderImplTests: XCTestCase {
    func testReleaseBuildUsesLoopbackOrigin() throws {
        let provider = WebViewProviderImpl()
        // Create webView to start the local server (port assigned dynamically)
        _ = provider.createWebView(onMessageReceived: { _ in }, isDebugMode: false)

        let url = try XCTUnwrap(provider.initialContentURL(queryParams: nil))
        XCTAssertEqual(url.scheme, "http")
        XCTAssertEqual(url.host, "127.0.0.1")
        XCTAssertNotNil(url.port)
        XCTAssertTrue(url.path.contains("/tunnel/tour/1"))
    }

    func testAllowedNavigationRejectsRemoteAlphaOrigin() {
        let provider = WebViewProviderImpl()
        _ = provider.createWebView(onMessageReceived: { _ in }, isDebugMode: false)

        XCTAssertTrue(
            provider.isAllowedNavigationURL(
                URL(string: "https://verify.didit.me/session/123")
            )
        )
        XCTAssertFalse(
            provider.isAllowedNavigationURL(
                URL(string: "https://self-app-alpha.vercel.app/tunnel/tour/1")
            )
        )
    }

    func testBridgeTrustRejectsVercelAndDidit() {
        let provider = WebViewProviderImpl()
        _ = provider.createWebView(onMessageReceived: { _ in }, isDebugMode: false)

        XCTAssertFalse(
            provider.isTrustedBridgeURL(
                URL(string: "https://verify.didit.me/session/123")
            )
        )
        XCTAssertFalse(
            provider.isTrustedBridgeURL(
                URL(string: "https://self-app-alpha.vercel.app/tunnel/tour/1")
            )
        )
    }
}
