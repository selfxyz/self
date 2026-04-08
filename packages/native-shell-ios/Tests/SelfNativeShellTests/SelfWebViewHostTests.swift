// SPDX-License-Identifier: BUSL-1.1

import XCTest
@testable import SelfNativeShell

final class SelfWebViewHostTests: XCTestCase {
    func testReleaseBuildUsesRemoteOrigin() throws {
        let router = MessageRouter(sendToWebView: { _ in })
        let host = SelfWebViewHost(router: router, isDebugMode: false)
        _ = host.createWebView()

        let url = try XCTUnwrap(host.initialContentURL(queryParams: ""))
        XCTAssertEqual(url.scheme, "https")
        XCTAssertEqual(url.host, "verify.self.xyz")
        XCTAssertTrue(url.path.contains("/v1/tunnel/tour/1"))
    }

    func testDebugBuildUsesLocalhost() throws {
        let router = MessageRouter(sendToWebView: { _ in })
        let host = SelfWebViewHost(router: router, isDebugMode: true)
        _ = host.createWebView()

        let url = try XCTUnwrap(host.initialContentURL(queryParams: ""))
        XCTAssertEqual(url.scheme, "http")
        XCTAssertEqual(url.host, "localhost")
        XCTAssertTrue(url.absoluteString.hasPrefix("http://localhost:5173"))
    }

    func testAllowedNavigationAcceptsRemoteOrigin() {
        let router = MessageRouter(sendToWebView: { _ in })
        let host = SelfWebViewHost(router: router, isDebugMode: false)
        _ = host.createWebView()

        XCTAssertTrue(
            host.isAllowedNavigationURL(
                URL(string: "https://verify.self.xyz/v1/tunnel/tour/1")
            )
        )
        XCTAssertTrue(
            host.isAllowedNavigationURL(
                URL(string: "https://verify.didit.me/session/123")
            )
        )
        XCTAssertFalse(
            host.isAllowedNavigationURL(
                URL(string: "https://evil.example.com/tunnel/tour/1")
            )
        )
    }

    func testHttpBaseURLProducesNilInRelease() {
        let router = MessageRouter(sendToWebView: { _ in })
        let host = SelfWebViewHost(
            router: router,
            isDebugMode: false,
            remoteWebAppBaseURL: URL(string: "http://verify.self.xyz")
        )
        _ = host.createWebView()

        XCTAssertNil(host.initialContentURL(queryParams: ""))
    }

    func testBridgeTrustAcceptsRemoteRejectsDidit() {
        let router = MessageRouter(sendToWebView: { _ in })
        let host = SelfWebViewHost(router: router, isDebugMode: false)
        _ = host.createWebView()

        XCTAssertTrue(
            host.isTrustedBridgeURL(
                URL(string: "https://verify.self.xyz/v1/tunnel/tour/1")
            )
        )
        XCTAssertFalse(
            host.isTrustedBridgeURL(
                URL(string: "https://verify.didit.me/session/123")
            )
        )
        XCTAssertFalse(
            host.isTrustedBridgeURL(
                URL(string: "https://evil.example.com/tunnel/tour/1")
            )
        )
    }
}
