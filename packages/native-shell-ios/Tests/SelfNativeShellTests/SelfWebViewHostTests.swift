// SPDX-License-Identifier: BUSL-1.1

import XCTest
@testable import SelfNativeShell

final class SelfWebViewHostTests: XCTestCase {
    func testReleaseBuildUsesLoopbackOrigin() throws {
        let router = MessageRouter(sendToWebView: { _ in })
        let host = SelfWebViewHost(router: router, isDebugMode: false)
        _ = host.createWebView()

        let url = try XCTUnwrap(host.initialContentURL(queryParams: ""))
        XCTAssertEqual(url.scheme, "http")
        XCTAssertEqual(url.host, "127.0.0.1")
        XCTAssertNotNil(url.port)
        XCTAssertTrue(url.path.contains("/tunnel/tour/1"))
    }

    func testAllowedNavigationRejectsRemoteAlphaOrigin() {
        let router = MessageRouter(sendToWebView: { _ in })
        let host = SelfWebViewHost(router: router, isDebugMode: false)
        _ = host.createWebView()

        XCTAssertTrue(
            host.isAllowedNavigationURL(
                URL(string: "https://verify.didit.me/session/123")
            )
        )
        XCTAssertFalse(
            host.isAllowedNavigationURL(
                URL(string: "https://self-app-alpha.vercel.app/tunnel/tour/1")
            )
        )
    }

    func testBridgeTrustRejectsVercelAndDidit() {
        let router = MessageRouter(sendToWebView: { _ in })
        let host = SelfWebViewHost(router: router, isDebugMode: false)
        _ = host.createWebView()

        XCTAssertFalse(
            host.isTrustedBridgeURL(
                URL(string: "https://verify.didit.me/session/123")
            )
        )
        XCTAssertFalse(
            host.isTrustedBridgeURL(
                URL(string: "https://self-app-alpha.vercel.app/tunnel/tour/1")
            )
        )
    }
}
