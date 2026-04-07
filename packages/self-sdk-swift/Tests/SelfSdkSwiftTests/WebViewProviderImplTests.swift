// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import XCTest
@testable import SelfSdkSwift

final class WebViewProviderImplTests: XCTestCase {
    func testReleaseBuildUsesRemoteOrigin() throws {
        let provider = WebViewProviderImpl()

        let url = try XCTUnwrap(provider.initialContentURL(queryParams: nil))
        XCTAssertEqual(url.scheme, "https")
        XCTAssertEqual(url.host, "self-app-alpha.vercel.app")
        XCTAssertTrue(url.path.contains("/tunnel/tour/1"))
    }

    func testDebugBuildUsesLocalhost() throws {
        let provider = WebViewProviderImpl()
        _ = provider.createWebView(onMessageReceived: { _ in }, isDebugMode: true)

        let url = try XCTUnwrap(provider.initialContentURL(queryParams: nil))
        XCTAssertEqual(url.scheme, "http")
        XCTAssertEqual(url.host, "127.0.0.1")
        XCTAssertEqual(url.port, 5173)
        XCTAssertTrue(url.path.contains("/tunnel/tour/1"))
    }

    func testHttpBaseURLProducesNilInRelease() {
        let provider = WebViewProviderImpl()
        provider.configureRemoteLoading(remoteWebAppBaseURL: "http://self-app-alpha.vercel.app")

        XCTAssertNil(provider.initialContentURL(queryParams: nil))
    }

    func testAllowedNavigationAcceptsRemoteAlphaAndDidit() {
        let provider = WebViewProviderImpl()

        XCTAssertTrue(
            provider.isAllowedNavigationURL(
                URL(string: "https://verify.didit.me/session/123")
            )
        )
        XCTAssertTrue(
            provider.isAllowedNavigationURL(
                URL(string: "https://self-app-alpha.vercel.app/tunnel/tour/1")
            )
        )
    }

    func testDiditOnNonStandardPortIsRejected() {
        let provider = WebViewProviderImpl()

        XCTAssertFalse(
            provider.isAllowedNavigationURL(
                URL(string: "https://verify.didit.me:8443/session/123")
            )
        )
    }

    func testAllowedNavigationRejectsArbitraryOrigins() {
        let provider = WebViewProviderImpl()

        XCTAssertFalse(
            provider.isAllowedNavigationURL(
                URL(string: "https://evil.com/tunnel/tour/1")
            )
        )
        XCTAssertFalse(
            provider.isAllowedNavigationURL(
                URL(string: "http://example.com/test")
            )
        )
    }

    func testBridgeTrustAcceptsRemoteOrigin() {
        let provider = WebViewProviderImpl()

        XCTAssertTrue(
            provider.isTrustedBridgeURL(
                URL(string: "https://self-app-alpha.vercel.app/tunnel/tour/1")
            )
        )
    }

    func testBridgeTrustRejectsDiditAndArbitrary() {
        let provider = WebViewProviderImpl()

        XCTAssertFalse(
            provider.isTrustedBridgeURL(
                URL(string: "https://verify.didit.me/session/123")
            )
        )
        XCTAssertFalse(
            provider.isTrustedBridgeURL(
                URL(string: "https://evil.com/tunnel/tour/1")
            )
        )
    }
}
